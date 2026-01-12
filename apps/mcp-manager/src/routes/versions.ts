import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { VersionCreateSchema } from '../schemas/mcp.schema';
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
  const mcpId = c.req.param('mcpId');
  const body = c.req.valid('json');

  // Verificar que el MCP existe
  const mcp = await c.env.DB.prepare(`
    SELECT * FROM mcp_servers WHERE id = ? AND deleted_at IS NULL
  `).bind(mcpId).first();

  if (!mcp) {
    return c.json({ error: 'MCP not found' }, 404);
  }

  // Verificar que la versión no existe
  const existingVersion = await c.env.DB.prepare(`
    SELECT id FROM mcp_versions WHERE mcp_id = ? AND version = ?
  `).bind(mcpId, body.version).first();

  if (existingVersion) {
    return c.json({ error: 'Version already exists' }, 409);
  }

  // Crear bundle
  const bundleService = new BundleService(c.env.BUNDLES, c.env.DB);
  const bundle = await bundleService.createBundle(mcpId, body.version, body.sourceCode);

  // Guardar versión en DB
  const versionId = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO mcp_versions (id, mcp_id, version, bundle_key, changelog, config_snapshot)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    versionId,
    mcpId,
    body.version,
    bundle.key,
    body.changelog || null,
    JSON.stringify({
      tools: body.tools,
      bindings: body.bindings,
    }),
  ).run();

  return c.json({
    id: versionId,
    version: body.version,
    bundleKey: bundle.key,
    bundleSize: bundle.size,
  }, 201);
});

// Publicar versión (deploy a Cloudflare)
versionRoutes.post('/:mcpId/:version/publish', async (c: any) => {
  const mcpId = c.req.param('mcpId');
  const version = c.req.param('version');

  // Obtener versión
  const versionRecord = await c.env.DB.prepare(`
    SELECT * FROM mcp_versions WHERE mcp_id = ? AND version = ?
  `).bind(mcpId, version).first();

  if (!versionRecord) {
    return c.json({ error: 'Version not found' }, 404);
  }

  // Obtener MCP y su config de auth
  const mcp = await c.env.DB.prepare(`
    SELECT ms.*, mac.*
    FROM mcp_servers ms
    LEFT JOIN mcp_auth_configs mac ON ms.id = mac.mcp_id
    WHERE ms.id = ?
  `).bind(mcpId).first();

  // Crear operación en Durable Object
  const operationId = `${mcpId}-${version}-${Date.now()}`;
  const id = c.env.MCP_OPERATION.idFromName(operationId);
  const stub = c.env.MCP_OPERATION.get(id);

  // Iniciar publicación
  const response = await stub.fetch(new Request('http://internal/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mcpId,
      version,
      bundleKey: versionRecord.bundle_key,
      config: JSON.parse(versionRecord.config_snapshot as string),
      authType: mcp.auth_type,
    }),
  }));

  const result = await response.json();

  // Crear registro de deployment
  const deploymentId = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO deployments (id, mcp_id, version_id, operation_type, status, started_at)
    VALUES (?, ?, ?, 'publish', 'in_progress', ?)
  `).bind(deploymentId, mcpId, versionRecord.id, Date.now()).run();

  return c.json({
    deploymentId,
    operationId: result.operationId,
    streamUrl: `/api/deployments/${deploymentId}/stream`,
  });
});

// Listar versiones de un MCP
versionRoutes.get('/:mcpId', async (c: any) => {
  const mcpId = c.req.param('mcpId');

  const { results } = await c.env.DB.prepare(`
    SELECT v.*,
           d.status as last_deploy_status,
           d.completed_at as last_deploy_time
    FROM mcp_versions v
    LEFT JOIN (
      SELECT version_id, status, completed_at
      FROM deployments
      WHERE id IN (
        SELECT MAX(id) FROM deployments GROUP BY version_id
      )
    ) d ON v.id = d.version_id
    WHERE v.mcp_id = ?
    ORDER BY v.created_at DESC
  `).bind(mcpId).all();

  return c.json({ versions: results });
});

// Rollback to a specific version
versionRoutes.post('/:mcpId/:version/rollback', async (c: any) => {
  const mcpId = c.req.param('mcpId');
  const version = c.req.param('version');

  try {
    // Verify the version exists
    const versionRecord = await c.env.DB.prepare(`
      SELECT * FROM mcp_versions WHERE mcp_id = ? AND version = ?
    `).bind(mcpId, version).first();

    if (!versionRecord) {
      return c.json({ error: 'Version not found' }, 404);
    }

    // Check if this version is already active
    if (versionRecord.is_active) {
      return c.json({ error: 'This version is already active' }, 400);
    }

    // Initialize services
    const cloudflareApi = new CloudflareApiService(c.env.CF_API_TOKEN, c.env.CF_ACCOUNT_ID);
    const workerGenerator = new WorkerGenerator();
    const rollbackService = new RollbackService(
      c.env.DB,
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

