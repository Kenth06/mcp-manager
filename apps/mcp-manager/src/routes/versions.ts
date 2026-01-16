import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { VersionCreateSchema } from '../schemas/mcp.schema';
import { createDb } from '../db';
import { deployments, mcpAuthConfigs, mcpServers, mcpVersions } from '../db/schema';
import { extractBindings, mergeBindingConfig } from '../lib/bindings';
import { BundleService } from '../services/bundle-service';
import { RollbackService } from '../services/rollback-service';
import { CloudflareApiService } from '../services/cloudflare-api';
import { WorkerGenerator } from '../services/worker-generator';

type Bindings = {
  DB: D1Database;
  BUNDLES: R2Bucket;
  CACHE: KVNamespace;
  MCP_OPERATION: DurableObjectNamespace;
  DEPLOYMENT_STATE: DurableObjectNamespace;
  CF_API_TOKEN: string;
  CF_ACCOUNT_ID: string;
};

export const versionRoutes = new Hono<{ Bindings: Bindings }>();

// Crear nueva versión
versionRoutes.post('/:mcpId', zValidator('json', VersionCreateSchema), async (c: any) => {
  const db = createDb(c.env.DB);
  const mcpId = c.req.param('mcpId');
  const body = c.req.valid('json');

  // Verificar que el MCP existe
  const mcpRows = await db
    .select({ id: mcpServers.id, bindings: mcpServers.bindings })
    .from(mcpServers)
    .where(and(eq(mcpServers.id, mcpId), isNull(mcpServers.deletedAt)))
    .limit(1);
  const mcp = mcpRows[0];

  if (!mcp) {
    return c.json({ error: 'MCP not found' }, 404);
  }

  // Verificar que la versión no existe
  const existingVersionRows = await db
    .select({ id: mcpVersions.id })
    .from(mcpVersions)
    .where(and(eq(mcpVersions.mcpId, mcpId), eq(mcpVersions.version, body.version)))
    .limit(1);
  const existingVersion = existingVersionRows[0];

  if (existingVersion) {
    return c.json({ error: 'Version already exists' }, 409);
  }

  // Crear bundle
  const bundleService = new BundleService(c.env.BUNDLES, c.env.DB);
  const bundle = await bundleService.createBundle(mcpId, body.version, body.sourceCode);

  // Guardar versión en DB
  const versionId = crypto.randomUUID();
  const now = Date.now();
  const configBindings = body.bindings ?? (mcp.bindings ? safeJsonParse(mcp.bindings as string) : undefined);

  await db.insert(mcpVersions).values({
    id: versionId,
    mcpId,
    version: body.version,
    bundleKey: bundle.key,
    changelog: body.changelog || null,
    configSnapshot: JSON.stringify({
      tools: body.tools,
      bindings: configBindings,
    }),
    createdAt: now,
  });

  return c.json({
    id: versionId,
    version: body.version,
    bundleKey: bundle.key,
    bundleSize: bundle.size,
  }, 201);
});

// Publicar versión (deploy a Cloudflare)
versionRoutes.post('/:mcpId/:version/publish', async (c: any) => {
  const db = createDb(c.env.DB);
  const mcpId = c.req.param('mcpId');
  const version = c.req.param('version');

  // Obtener versión
  const versionRows = await db
    .select()
    .from(mcpVersions)
    .where(and(eq(mcpVersions.mcpId, mcpId), eq(mcpVersions.version, version)))
    .limit(1);
  const versionRecord = versionRows[0];

  if (!versionRecord) {
    return c.json({ error: 'Version not found' }, 404);
  }

  // Obtener MCP y su config de auth
  const mcpRows = await db
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
    return c.json({ error: 'MCP not found' }, 404);
  }

  // Crear operación en Durable Object
  const operationId = `${mcpId}-${version}-${Date.now()}`;
  const id = c.env.MCP_OPERATION.idFromName(operationId);
  const stub = c.env.MCP_OPERATION.get(id);

  // Crear registro de deployment
  const deploymentId = crypto.randomUUID();
  await db.insert(deployments).values({
    id: deploymentId,
    mcpId,
    versionId: versionRecord.id,
    operationType: 'publish',
    status: 'in_progress',
    startedAt: Date.now(),
  });

  // Initialize deployment state DO for SSE
  const deploymentDO = c.env.DEPLOYMENT_STATE;
  const deploymentDoId = deploymentDO.idFromName(deploymentId);
  const deploymentStub = deploymentDO.get(deploymentDoId);
  await deploymentStub.fetch(new Request('http://internal/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deploymentId }),
  }));

  // Iniciar publicación
  try {
    let configSnapshot: any;
    try {
      configSnapshot = JSON.parse(versionRecord.configSnapshot as string);
    } catch {
      return c.json({ error: 'Invalid config snapshot for version' }, 500);
    }

    if (!configSnapshot || typeof configSnapshot !== 'object') {
      return c.json({ error: 'Invalid config snapshot for version' }, 500);
    }
    if (!Array.isArray(configSnapshot.tools)) {
      return c.json({ error: 'Invalid config snapshot: tools missing' }, 500);
    }

    const snapshotBindings = extractBindings(configSnapshot.bindings);
    const serverBindings = extractBindings(mcp.bindings ? safeJsonParse(mcp.bindings as string) : undefined);
    const bindings = Object.keys(snapshotBindings.bindings).length > 0
      ? snapshotBindings.bindings
      : serverBindings.bindings;
    const bindingConfig = mergeBindingConfig(snapshotBindings.bindingConfig, serverBindings.bindingConfig);
    configSnapshot.bindings = bindings;

    const response = await stub.fetch(new Request('http://internal/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mcpId,
        version,
        bundleKey: versionRecord.bundleKey,
        config: configSnapshot,
        bindingConfig,
        authType: mcp.auth_type,
        apiKeyHash: mcp.api_key_hash || null,
        oauth: {
          provider: mcp.oauth_provider || null,
          clientId: mcp.oauth_client_id || null,
          clientSecret: mcp.oauth_client_secret || null,
          introspectionUrl: mcp.oauth_introspection_url || null,
          scopes: mcp.scopes ? safeJsonParse(mcp.scopes) : null,
        },
        deploymentId,
      }),
    }));

    if (!response.ok) {
      const errorText = await response.text();
      const failedAt = Date.now();
      await db
        .update(deployments)
        .set({
          status: 'failed',
          completedAt: failedAt,
          errorMessage: errorText,
        })
        .where(eq(deployments.id, deploymentId));
      await deploymentStub.fetch(new Request('http://internal/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'failed', error: errorText }),
      }));
      return c.json({ error: 'Publish failed', details: errorText }, 500);
    }

    const result = await response.json();

    return c.json({
      deploymentId,
      operationId: result.operationId,
      streamUrl: `/api/deployments/${deploymentId}/stream`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Publish failed';
    const failedAt = Date.now();
    await db
      .update(deployments)
      .set({
        status: 'failed',
        completedAt: failedAt,
        errorMessage: message,
      })
      .where(eq(deployments.id, deploymentId));
    await deploymentStub.fetch(new Request('http://internal/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'failed', error: message }),
    }));
    return c.json({ error: message }, 500);
  }
});

// Listar versiones de un MCP
versionRoutes.get('/:mcpId', async (c: any) => {
  const db = createDb(c.env.DB);
  const mcpId = c.req.param('mcpId');

  const versions = await db
    .select()
    .from(mcpVersions)
    .where(eq(mcpVersions.mcpId, mcpId))
    .orderBy(desc(mcpVersions.createdAt));

  const versionIds = versions.map((versionRow) => versionRow.id);
  const latestByVersion = new Map<string, { status: string; completedAt: number | null }>();

  if (versionIds.length > 0) {
    const deploymentRows = await db
      .select({
        versionId: deployments.versionId,
        status: deployments.status,
        completedAt: deployments.completedAt,
        startedAt: deployments.startedAt,
      })
      .from(deployments)
      .where(inArray(deployments.versionId, versionIds))
      .orderBy(desc(deployments.startedAt));

    for (const row of deploymentRows) {
      if (!latestByVersion.has(row.versionId)) {
        latestByVersion.set(row.versionId, {
          status: row.status,
          completedAt: row.completedAt ?? null,
        });
      }
    }
  }

  const enrichedVersions = versions.map((versionRow) => {
    const latest = latestByVersion.get(versionRow.id);
    return {
      id: versionRow.id,
      mcp_id: versionRow.mcpId,
      version: versionRow.version,
      bundle_key: versionRow.bundleKey,
      changelog: versionRow.changelog,
      config_snapshot: versionRow.configSnapshot,
      is_active: versionRow.isActive,
      deployed_at: versionRow.deployedAt,
      created_at: versionRow.createdAt,
      last_deploy_status: latest?.status,
      last_deploy_time: latest?.completedAt ?? null,
    };
  });

  return c.json({ versions: enrichedVersions });
});

// Rollback to a specific version
versionRoutes.post('/:mcpId/:version/rollback', async (c: any) => {
  const db = createDb(c.env.DB);
  const mcpId = c.req.param('mcpId');
  const version = c.req.param('version');

  try {
    // Verify the version exists
    const versionRows = await db
      .select()
      .from(mcpVersions)
      .where(and(eq(mcpVersions.mcpId, mcpId), eq(mcpVersions.version, version)))
      .limit(1);
    const versionRecord = versionRows[0];

    if (!versionRecord) {
      return c.json({ error: 'Version not found' }, 404);
    }

    // Check if this version is already active
    if (versionRecord.isActive) {
      return c.json({ error: 'This version is already active' }, 400);
    }

    // Initialize services
    const cloudflareApi = new CloudflareApiService(c.env.CF_API_TOKEN, c.env.CF_ACCOUNT_ID);
    const workerGenerator = new WorkerGenerator();
    const rollbackService = new RollbackService(
      db,
      cloudflareApi,
      workerGenerator,
      c.env.BUNDLES
    );

    // Perform rollback
    await rollbackService.rollback(mcpId, version);

    return c.json({
      success: true,
      message: `Successfully rolled back to version ${version}`,
      version,
    });
  } catch (error) {
    console.error('Rollback failed:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Rollback failed',
    }, 500);
  }
});

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
