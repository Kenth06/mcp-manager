import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { createDb } from '../db';
import type { DbClient } from '../db';
import { deployments, mcpServers, mcpVersions } from '../db/schema';
import { CloudflareApiService, type BindingConfig } from '../services/cloudflare-api';
import { WorkerGenerator } from '../services/worker-generator';
import { BundleService } from '../services/bundle-service';
import { RollbackService } from '../services/rollback-service';
import { extractBindings } from '../lib/bindings';
import { buildAuthSecrets } from '../lib/auth';

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
  deploymentId?: string;
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
    d1?: Array<string | { name: string; databaseId?: string }>;
    kv?: Array<string | { name: string; namespaceId?: string }>;
    r2?: Array<string | { name: string; bucketName?: string }>;
    secrets?: string[];
  };
}

interface OAuthConfig {
  provider?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  introspectionUrl?: string | null;
  scopes?: string[] | null;
}

type Env = {
  BUNDLES: R2Bucket;
  CF_API_TOKEN: string;
  CF_ACCOUNT_ID: string;
  DB: D1Database;
  DEPLOYMENT_STATE: DurableObjectNamespace;
};

export class McpOperationDO extends DurableObject<Env> {
  private app: Hono;
  private operation: McpOperation | null = null;
  private connections: Set<WebSocket> = new Set();
  private cloudflareApi: CloudflareApiService;
  private workerGenerator: WorkerGenerator;
  private bundleService: BundleService;
  private rollbackService: RollbackService;
  private db: DbClient;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this.db = createDb(env.DB);
    this.cloudflareApi = new CloudflareApiService(env.CF_API_TOKEN, env.CF_ACCOUNT_ID);
    this.workerGenerator = new WorkerGenerator();
    this.bundleService = new BundleService(env.BUNDLES, env.DB);
    this.rollbackService = new RollbackService(this.db, this.cloudflareApi, this.workerGenerator, env.BUNDLES);
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
        bindingConfig?: BindingConfig;
        authType: string;
        apiKeyHash?: string | null;
        oauth?: OAuthConfig;
        deploymentId?: string;
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
        deploymentId: body.deploymentId,
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
    bindingConfig?: BindingConfig;
    authType: string;
    apiKeyHash?: string | null;
    oauth?: OAuthConfig;
    deploymentId?: string;
  }): Promise<void> {
    try {
      const { bindings, bindingConfig } = extractBindings(params.config.bindings);
      this.cloudflareApi.setBindingConfig(params.bindingConfig ?? bindingConfig);

      await this.updateDeploymentStatus(params.deploymentId, 'in_progress');
      await this.emitProgress(params.deploymentId, 'initializing', 5, 'Initializing deployment');
      this.addLog('info', 'Fetching bundle from R2...');
      await this.emitProgress(params.deploymentId, 'fetching_bundle', 20, 'Fetching bundle from R2');
      const bundleContent = await this.bundleService.getBundle(params.bundleKey);
      if (!bundleContent) {
        throw new Error('Bundle not found');
      }

      this.addLog('info', 'Preparing Worker script...');
      await this.emitProgress(params.deploymentId, 'preparing_worker', 40, 'Preparing Worker script');
      const workerScript = this.workerGenerator.generateWorkerScript({
        name: `mcp-${params.mcpId}`,
        version: params.version,
        tools: params.config.tools,
        bindings,
        authType: params.authType as any,
      });

      this.addLog('info', 'Deploying to Cloudflare...');
      await this.emitProgress(params.deploymentId, 'deploying', 70, 'Deploying to Cloudflare');
      const workerName = `mcp-${params.mcpId}-v${params.version.replace(/\./g, '-')}`;
      
      const secrets = buildAuthSecrets(
        params.authType as 'public' | 'api_key' | 'oauth',
        params.apiKeyHash,
        params.oauth
      );

      await this.cloudflareApi.deployWorker(
        workerName,
        workerScript,
        bindings,
        {},
        secrets
      );

      this.addLog('info', 'Updating routing...');
      await this.emitProgress(params.deploymentId, 'updating_routing', 85, 'Updating routing');

      // Generate the correct endpoint URL using the Cloudflare account
      const endpointUrl = this.cloudflareApi.getWorkerEndpointUrl(workerName);

      this.addLog('info', 'Updating MCP server status in D1...');
      await this.db
        .update(mcpServers)
        .set({
          currentVersion: params.version,
          workerName,
          endpointUrl,
          updatedAt: Date.now(),
        })
        .where(eq(mcpServers.id, params.mcpId));

      await this.db
        .update(mcpVersions)
        .set({ isActive: 0 })
        .where(and(eq(mcpVersions.mcpId, params.mcpId), eq(mcpVersions.isActive, 1)));

      await this.db
        .update(mcpVersions)
        .set({ deployedAt: Date.now(), isActive: 1 })
        .where(and(eq(mcpVersions.mcpId, params.mcpId), eq(mcpVersions.version, params.version)));

      await this.completeDeployment(params.deploymentId, 'completed', workerName);
      await this.emitProgress(params.deploymentId, 'completed', 100, 'Deployment completed');
      this.updateStatus('completed');
      this.addLog('info', 'Deployment completed successfully');

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.completeDeployment(params.deploymentId, 'failed', undefined, message);
      await this.emitProgress(params.deploymentId, 'failed', 100, 'Deployment failed', { error: message });
      this.updateStatus('failed', message);
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
    if (this.operation.deploymentId) {
      this.ctx.waitUntil(this.emitLog(this.operation.deploymentId, level, message, data));
    }
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

  private async updateDeploymentStatus(
    deploymentId: string | undefined,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
    error?: string
  ): Promise<void> {
    if (!deploymentId) {
      return;
    }

    await this.emitStatus(deploymentId, status, error);
  }

  private async completeDeployment(
    deploymentId: string | undefined,
    status: 'completed' | 'failed',
    workerName?: string,
    errorMessage?: string
  ): Promise<void> {
    if (!deploymentId) {
      return;
    }

    const updates: Record<string, unknown> = {
      status,
      completedAt: Date.now(),
      errorMessage: errorMessage ?? null,
    };
    if (workerName) {
      updates.workerName = workerName;
    }

    await this.db
      .update(deployments)
      .set(updates)
      .where(eq(deployments.id, deploymentId));

    await this.emitStatus(deploymentId, status, errorMessage);
  }

  private async emitLog(
    deploymentId: string | undefined,
    level: OperationLog['level'],
    message: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    if (!deploymentId) {
      return;
    }

    await this.postDeploymentEvent(deploymentId, '/log', {
      level,
      message,
      data,
    });
  }

  private async emitProgress(
    deploymentId: string | undefined,
    step: string,
    progress: number,
    message: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    if (!deploymentId) {
      return;
    }

    await this.postDeploymentEvent(deploymentId, '/progress', {
      step,
      progress,
      message,
      data,
    });
  }

  private async emitStatus(
    deploymentId: string | undefined,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
    error?: string
  ): Promise<void> {
    if (!deploymentId) {
      return;
    }

    await this.postDeploymentEvent(deploymentId, '/update-status', {
      status,
      error,
    });
  }

  private async postDeploymentEvent(
    deploymentId: string,
    path: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    try {
      const deploymentDO = this.env.DEPLOYMENT_STATE;
      const doId = deploymentDO.idFromName(deploymentId);
      const stub = deploymentDO.get(doId);
      await stub.fetch(new Request(`http://internal${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }));
    } catch {
      // Best-effort telemetry; ignore failures
    }
  }
}
