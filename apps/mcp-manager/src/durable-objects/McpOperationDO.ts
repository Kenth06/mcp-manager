import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { CloudflareApiService } from '../services/cloudflare-api';
import { WorkerGenerator } from '../services/worker-generator';
import { BundleService } from '../services/bundle-service';
import { RollbackService } from '../services/rollback-service';

interface McpOperation {
  id: string;
  mcpId: string;
  type: 'publish' | 'rollback' | 'delete';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  version: string;
  createdAt: number;
  updatedAt: number;
  logs: OperationLog[];
  error?: string;
}

interface OperationLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

interface McpConfig {
  tools: Array<{
    name: string;
    description: string;
    inputSchema: Record<string, any>;
    handler: string;
  }>;
  bindings?: {
    d1?: string[];
    kv?: string[];
    r2?: string[];
    secrets?: string[];
  };
}

type Env = {
  BUNDLES: R2Bucket;
  CF_API_TOKEN: string;
  CF_ACCOUNT_ID: string;
  DB: D1Database;
};

export class McpOperationDO extends DurableObject<Env> {
  private app: Hono;
  private operation: McpOperation | null = null;
  private connections: Set<WebSocket> = new Set();
  private cloudflareApi: CloudflareApiService;
  private workerGenerator: WorkerGenerator;
  private bundleService: BundleService;
  private rollbackService: RollbackService;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.cloudflareApi = new CloudflareApiService(env.CF_API_TOKEN, env.CF_ACCOUNT_ID);
    this.workerGenerator = new WorkerGenerator();
    this.bundleService = new BundleService(env.BUNDLES, env.DB);
    this.rollbackService = new RollbackService(env.DB, this.cloudflareApi, this.workerGenerator, env.BUNDLES);
    this.app = this.createApp();
  }

  private createApp(): Hono {
    const app = new Hono();

    app.get('/status', async (c) => {
      if (!this.operation) {
        return c.json({ error: 'No operation found' }, 404);
      }
      return c.json(this.operation);
    });

    app.post('/publish', async (c) => {
      const body = await c.req.json<{
        mcpId: string;
        version: string;
        bundleKey: string;
        config: McpConfig;
        authType: string;
      }>();

      this.operation = {
        id: crypto.randomUUID(),
        mcpId: body.mcpId,
        type: 'publish',
        status: 'in_progress',
        version: body.version,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        logs: [],
      };

      this.ctx.waitUntil(this.executePublish(body));

      return c.json({ operationId: this.operation.id });
    });

    app.get('/ws', async (c) => {
      const upgradeHeader = c.req.header('Upgrade');
      if (upgradeHeader !== 'websocket') {
        return c.text('Expected WebSocket', 400);
      }

      const [client, server] = Object.values(new WebSocketPair());
      this.connections.add(server);
      
      server.accept();
      server.addEventListener('close', () => {
        this.connections.delete(server);
      });

      if (this.operation) {
        server.send(JSON.stringify({
          type: 'state',
          data: this.operation,
        }));
      }

      return new Response(null, { status: 101, webSocket: client });
    });

    app.post('/rollback', async (c) => {
      const body = await c.req.json<{
        mcpId: string;
        targetVersion: string;
      }>();

      this.operation = {
        id: crypto.randomUUID(),
        mcpId: body.mcpId,
        type: 'rollback',
        status: 'in_progress',
        version: body.targetVersion,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        logs: [],
      };

      this.ctx.waitUntil(this.executeRollback(body));

      return c.json({ operationId: this.operation.id });
    });

    return app;
  }

  private async executePublish(params: {
    mcpId: string;
    version: string;
    bundleKey: string;
    config: McpConfig;
    authType: string;
  }): Promise<void> {
    try {
      this.addLog('info', 'Fetching bundle from R2...');
      const bundleContent = await this.bundleService.getBundle(params.bundleKey);
      if (!bundleContent) {
        throw new Error('Bundle not found');
      }

      this.addLog('info', 'Preparing Worker script...');
      const workerScript = this.workerGenerator.generateWorkerScript({
        name: `mcp-${params.mcpId}`,
        version: params.version,
        tools: params.config.tools,
        bindings: params.config.bindings,
        authType: params.authType as any,
      });

      this.addLog('info', 'Deploying to Cloudflare...');
      const workerName = `mcp-${params.mcpId}-v${params.version.replace(/\./g, '-')}`;
      
      await this.cloudflareApi.deployWorker(
        workerName,
        workerScript,
        params.config.bindings || {},
        { MCP_API_KEY: 'your_api_key_here' }
      );

      this.addLog('info', 'Updating routing...');

      // Generate the correct endpoint URL using the Cloudflare account
      const endpointUrl = this.cloudflareApi.getWorkerEndpointUrl(workerName);

      this.addLog('info', 'Updating MCP server status in D1...');
      await this.env.DB.prepare(`
        UPDATE mcp_servers
        SET current_version = ?, worker_name = ?, endpoint_url = ?, updated_at = ?
        WHERE id = ?
      `).bind(params.version, workerName, endpointUrl, Date.now(), params.mcpId).run();

      await this.env.DB.prepare(`
        UPDATE mcp_versions
        SET is_active = FALSE
        WHERE mcp_id = ? AND is_active = TRUE;
      `).bind(params.mcpId).run();

      await this.env.DB.prepare(`
        UPDATE mcp_versions
        SET deployed_at = ?, is_active = TRUE
        WHERE mcp_id = ? AND version = ?;
      `).bind(Date.now(), params.mcpId, params.version).run();

      this.updateStatus('completed');
      this.addLog('info', 'Deployment completed successfully');

    } catch (error) {
      this.updateStatus('failed', error instanceof Error ? error.message : 'Unknown error');
      this.addLog('error', `Deployment failed: ${error}`);
    }
  }

  private async executeRollback(params: {
    mcpId: string;
    targetVersion: string;
  }): Promise<void> {
    try {
      this.addLog('info', `Rolling back to version ${params.targetVersion}...`);
      
      await this.rollbackService.rollback(params.mcpId, params.targetVersion);

      this.updateStatus('completed');
      this.addLog('info', 'Rollback completed successfully');
    } catch (error) {
      this.updateStatus('failed', error instanceof Error ? error.message : 'Unknown error');
      this.addLog('error', `Rollback failed: ${error}`);
    }
  }

  private addLog(level: OperationLog['level'], message: string, data?: Record<string, unknown>): void {
    if (!this.operation) return;
    
    const log: OperationLog = {
      timestamp: Date.now(),
      level,
      message,
      data,
    };
    
    this.operation.logs.push(log);
    this.operation.updatedAt = Date.now();
    
    this.broadcast({ type: 'log', data: log });
  }

  private updateStatus(status: McpOperation['status'], error?: string): void {
    if (!this.operation) return;
    
    this.operation.status = status;
    this.operation.updatedAt = Date.now();
    if (error) this.operation.error = error;
    
    this.broadcast({ type: 'status', data: { status, error } });
  }

  private broadcast(message: object): void {
    const payload = JSON.stringify(message);
    for (const ws of this.connections) {
      try {
        ws.send(payload);
      } catch {
        this.connections.delete(ws);
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request);
  }
}

