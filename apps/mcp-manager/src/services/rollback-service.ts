import { and, eq } from 'drizzle-orm';
import type { DbClient } from '../db';
import { deployments, mcpAuthConfigs, mcpServers, mcpVersions } from '../db/schema';
import { CloudflareApiService } from './cloudflare-api';
import { WorkerGenerator } from './worker-generator';
import { extractBindings, mergeBindingConfig } from '../lib/bindings';
import { buildAuthSecrets } from '../lib/auth';

export class RollbackService {
  constructor(
    private db: DbClient,
    private cloudflareApi: CloudflareApiService,
    private workerGenerator: WorkerGenerator,
    private r2: R2Bucket,
  ) {}

  async rollback(mcpId: string, targetVersion: string): Promise<void> {
    // 1. Get target version
    const targetRows = await this.db
      .select()
      .from(mcpVersions)
      .where(and(eq(mcpVersions.mcpId, mcpId), eq(mcpVersions.version, targetVersion)))
      .limit(1);
    const targetVersionRecord = targetRows[0];

    if (!targetVersionRecord) {
      throw new Error(`Target version ${targetVersion} not found for MCP ${mcpId}`);
    }

    // 2. Deactivate current version
    await this.db
      .update(mcpVersions)
      .set({ isActive: 0 })
      .where(and(eq(mcpVersions.mcpId, mcpId), eq(mcpVersions.isActive, 1)));

    // 3. Activate target version
    await this.db
      .update(mcpVersions)
      .set({ isActive: 1, deployedAt: Date.now() })
      .where(eq(mcpVersions.id, targetVersionRecord.id));

    // 4. Get MCP with auth config
    const mcpRows = await this.db
      .select({
        id: mcpServers.id,
        bindings: mcpServers.bindings,
        auth_type: mcpServers.authType,
        api_key_hash: mcpAuthConfigs.apiKeyHash,
        oauth_provider: mcpAuthConfigs.oauthProvider,
        oauth_client_id: mcpAuthConfigs.oauthClientId,
        oauth_client_secret: mcpAuthConfigs.oauthClientSecret,
        oauth_introspection_url: mcpAuthConfigs.oauthIntrospectionUrl,
        scopes: mcpAuthConfigs.scopes,
      })
      .from(mcpServers)
      .leftJoin(mcpAuthConfigs, eq(mcpServers.id, mcpAuthConfigs.mcpId))
      .where(eq(mcpServers.id, mcpId))
      .limit(1);
    const mcp = mcpRows[0];

    if (!mcp) {
      throw new Error(`MCP with ID ${mcpId} not found`);
    }

    const bundleKey = targetVersionRecord.bundleKey as string;
    const bundleContent = await this.r2.get(bundleKey);
    if (!bundleContent) {
      throw new Error(`Bundle for version ${targetVersion} not found in R2`);
    }

    const configSnapshot = JSON.parse(targetVersionRecord.configSnapshot as string) as {
      tools: Array<{
        name: string;
        description: string;
        inputSchema: Record<string, unknown>;
        handler: string;
      }>;
      bindings?: {
        d1?: Array<string | { name: string; databaseId?: string }>;
        kv?: Array<string | { name: string; namespaceId?: string }>;
        r2?: Array<string | { name: string; bucketName?: string }>;
        secrets?: string[];
      };
    };
    const snapshotBindings = extractBindings(configSnapshot.bindings);
    const serverBindings = extractBindings(mcp.bindings ? safeJsonParse(mcp.bindings as string) : undefined);
    const bindings = Object.keys(snapshotBindings.bindings).length > 0
      ? snapshotBindings.bindings
      : serverBindings.bindings;
    const bindingConfig = mergeBindingConfig(snapshotBindings.bindingConfig, serverBindings.bindingConfig);
    this.cloudflareApi.setBindingConfig(bindingConfig);

    const authType = (mcp.auth_type as 'public' | 'api_key' | 'oauth') || 'public';

    const workerScript = this.workerGenerator.generateWorkerScript({
      name: `mcp-${mcpId}`,
      version: targetVersion,
      tools: configSnapshot.tools,
      bindings,
      authType,
    });

    const secrets = buildAuthSecrets(authType, mcp.api_key_hash as string | null, {
      provider: mcp.oauth_provider as string | null,
      clientId: mcp.oauth_client_id as string | null,
      clientSecret: mcp.oauth_client_secret as string | null,
      introspectionUrl: mcp.oauth_introspection_url as string | null,
      scopes: mcp.scopes as string | null,
    });

    const workerName = `mcp-${mcpId}-v${targetVersion.replace(/\./g, '-')}`;
    await this.cloudflareApi.deployWorker(
      workerName,
      workerScript,
      bindings,
      {},
      secrets
    );

    // 5. Update MCP record with new active version
    await this.db
      .update(mcpServers)
      .set({
        currentVersion: targetVersion,
        workerName,
        updatedAt: Date.now(),
      })
      .where(eq(mcpServers.id, mcpId));

    // Record deployment
    const deploymentId = crypto.randomUUID();
    await this.db.insert(deployments).values({
      id: deploymentId,
      mcpId,
      versionId: targetVersionRecord.id,
      operationType: 'rollback',
      status: 'completed',
      workerName,
      startedAt: Date.now(),
      completedAt: Date.now(),
    });
  }
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
