import { CloudflareApiService } from './cloudflare-api';
import { WorkerGenerator } from './worker-generator';

export class RollbackService {
  constructor(
    private db: D1Database,
    private cloudflareApi: CloudflareApiService,
    private workerGenerator: WorkerGenerator,
    private r2: R2Bucket,
  ) {}

  async rollback(mcpId: string, targetVersion: string): Promise<void> {
    // 1. Obtener la versión objetivo
    const targetVersionRecord = await this.db.prepare(`
      SELECT * FROM mcp_versions WHERE mcp_id = ? AND version = ?
    `).bind(mcpId, targetVersion).first();

    if (!targetVersionRecord) {
      throw new Error(`Target version ${targetVersion} not found for MCP ${mcpId}`);
    }

    // 2. Desactivar la versión actual
    await this.db.prepare(`
      UPDATE mcp_versions SET is_active = FALSE WHERE mcp_id = ? AND is_active = TRUE
    `).bind(mcpId).run();

    // 3. Activar la versión objetivo
    await this.db.prepare(`
      UPDATE mcp_versions SET is_active = TRUE, deployed_at = ? WHERE id = ?
    `).bind(Date.now(), targetVersionRecord.id).run();

    // 4. Regenerar y desplegar el worker con la versión objetivo
    const mcp = await this.db.prepare(`
      SELECT ms.*, mac.auth_type as auth_config_type
      FROM mcp_servers ms
      LEFT JOIN mcp_auth_configs mac ON ms.id = mac.mcp_id
      WHERE ms.id = ?
    `).bind(mcpId).first();

    if (!mcp) {
      throw new Error(`MCP with ID ${mcpId} not found`);
    }

    const bundleKey = targetVersionRecord.bundle_key as string;
    const bundleContent = await this.r2.get(bundleKey);
    if (!bundleContent) {
      throw new Error(`Bundle for version ${targetVersion} not found in R2`);
    }

    const configSnapshot = JSON.parse(targetVersionRecord.config_snapshot as string) as {
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
    };

    const authType = (mcp.auth_type as 'public' | 'api_key' | 'oauth') || 'public';

    const workerScript = this.workerGenerator.generateWorkerScript({
      name: `mcp-${mcpId}`,
      version: targetVersion,
      tools: configSnapshot.tools,
      bindings: configSnapshot.bindings,
      authType,
    });

    const workerName = `mcp-${mcpId}-v${targetVersion.replace(/\./g, '-')}`;
    await this.cloudflareApi.deployWorker(
      workerName,
      workerScript,
      configSnapshot.bindings || {},
      { MCP_API_KEY: 'your_api_key_here' } // TODO: Get actual API key from auth config
    );

    // 5. Actualizar el registro del MCP para reflejar la nueva versión activa
    await this.db.prepare(`
      UPDATE mcp_servers
      SET current_version = ?, worker_name = ?, updated_at = ?
      WHERE id = ?
    `).bind(targetVersion, workerName, Date.now(), mcpId).run();

    // Registrar deployment
    const deploymentId = crypto.randomUUID();
    await this.db.prepare(`
      INSERT INTO deployments (id, mcp_id, version_id, operation_type, status, worker_name, started_at, completed_at)
      VALUES (?, ?, ?, 'rollback', 'completed', ?, ?, ?)
    `).bind(deploymentId, mcpId, targetVersionRecord.id, workerName, Date.now(), Date.now()).run();
  }
}

