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
    // 1. Get target version
    const targetVersionRecord = await this.db.prepare(`
      SELECT * FROM mcp_versions WHERE mcp_id = ? AND version = ?
    `).bind(mcpId, targetVersion).first();

    if (!targetVersionRecord) {
      throw new Error(`Target version ${targetVersion} not found for MCP ${mcpId}`);
    }

    // 2. Deactivate current version
    await this.db.prepare(`
      UPDATE mcp_versions SET is_active = FALSE WHERE mcp_id = ? AND is_active = TRUE
    `).bind(mcpId).run();

    // 3. Activate target version
    await this.db.prepare(`
      UPDATE mcp_versions SET is_active = TRUE, deployed_at = ? WHERE id = ?
    `).bind(Date.now(), targetVersionRecord.id).run();

    // 4. Get MCP with auth config
    const mcp = await this.db.prepare(`
      SELECT ms.*, mac.auth_type as auth_config_type, mac.api_key_hash
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
        inputSchema: Record<string, unknown>;
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

    // Build secrets based on auth type
    const secrets: Record<string, string> = {};

    if (authType === 'api_key' && mcp.api_key_hash) {
      // Store the API key hash for validation in the worker
      // Note: The worker will compare hashes, not raw keys
      secrets.MCP_API_KEY_HASH = mcp.api_key_hash as string;
    }

    const workerName = `mcp-${mcpId}-v${targetVersion.replace(/\./g, '-')}`;
    await this.cloudflareApi.deployWorker(
      workerName,
      workerScript,
      configSnapshot.bindings || {},
      secrets
    );

    // 5. Update MCP record with new active version
    await this.db.prepare(`
      UPDATE mcp_servers
      SET current_version = ?, worker_name = ?, updated_at = ?
      WHERE id = ?
    `).bind(targetVersion, workerName, Date.now(), mcpId).run();

    // Record deployment
    const deploymentId = crypto.randomUUID();
    await this.db.prepare(`
      INSERT INTO deployments (id, mcp_id, version_id, operation_type, status, worker_name, started_at, completed_at)
      VALUES (?, ?, ?, 'rollback', 'completed', ?, ?, ?)
    `).bind(deploymentId, mcpId, targetVersionRecord.id, workerName, Date.now(), Date.now()).run();
  }
}
