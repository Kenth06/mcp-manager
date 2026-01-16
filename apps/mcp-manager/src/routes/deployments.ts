import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { count, desc, eq } from 'drizzle-orm';
import { DeploymentIdParamSchema } from '../schemas/mcp.schema';
import { createDb } from '../db';
import { deployments, mcpServers, mcpVersions } from '../db/schema';

type Bindings = {
  DB: D1Database;
  BUNDLES: R2Bucket;
  CACHE: KVNamespace;
  MCP_OPERATION: DurableObjectNamespace;
  DEPLOYMENT_STATE: DurableObjectNamespace;
  CF_API_TOKEN: string;
  CF_ACCOUNT_ID: string;
};

export const deploymentRoutes = new Hono<{ Bindings: Bindings }>();

// Listar deployments
deploymentRoutes.get('/', async (c: any) => {
  const db = createDb(c.env.DB);
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;
  const mcpId = c.req.query('mcpId');

  let query = db
    .select({
      id: deployments.id,
      mcp_id: deployments.mcpId,
      version_id: deployments.versionId,
      operation_type: deployments.operationType,
      status: deployments.status,
      worker_name: deployments.workerName,
      started_at: deployments.startedAt,
      completed_at: deployments.completedAt,
      error_message: deployments.errorMessage,
      mcp_name: mcpServers.name,
      version: mcpVersions.version,
    })
    .from(deployments)
    .innerJoin(mcpServers, eq(deployments.mcpId, mcpServers.id))
    .innerJoin(mcpVersions, eq(deployments.versionId, mcpVersions.id));

  if (mcpId) {
    query = query.where(eq(deployments.mcpId, mcpId));
  }

  const results = await query
    .orderBy(desc(deployments.startedAt))
    .limit(limit)
    .offset(offset);

  let countQuery = db
    .select({ count: count() })
    .from(deployments);

  if (mcpId) {
    countQuery = countQuery.where(eq(deployments.mcpId, mcpId));
  }

  const countRows = await countQuery;
  const total = Number(countRows[0]?.count ?? 0);

  return c.json({
    data: results,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// Obtener deployment por ID
deploymentRoutes.get(
  '/:id',
  zValidator('param', DeploymentIdParamSchema),
  async (c: any) => {
    const db = createDb(c.env.DB);
    const { id } = c.req.valid('param');
    
    const rows = await db
      .select({
        id: deployments.id,
        mcp_id: deployments.mcpId,
        version_id: deployments.versionId,
        operation_type: deployments.operationType,
        status: deployments.status,
        worker_name: deployments.workerName,
        started_at: deployments.startedAt,
        completed_at: deployments.completedAt,
        error_message: deployments.errorMessage,
        mcp_name: mcpServers.name,
        version: mcpVersions.version,
        bundle_key: mcpVersions.bundleKey,
      })
      .from(deployments)
      .innerJoin(mcpServers, eq(deployments.mcpId, mcpServers.id))
      .innerJoin(mcpVersions, eq(deployments.versionId, mcpVersions.id))
      .where(eq(deployments.id, id))
      .limit(1);
    const deployment = rows[0];

    if (!deployment) {
      return c.json({ error: 'Deployment not found' }, 404);
    }

    return c.json(deployment);
  }
);

// Stream endpoint para SSE
deploymentRoutes.get(
  '/:id/stream',
  zValidator('param', DeploymentIdParamSchema),
  async (c: any) => {
    const { id } = c.req.valid('param');
    const deploymentDO = c.env.DEPLOYMENT_STATE;

    const doId = deploymentDO.idFromName(id);
    const deploymentDOInstance = deploymentDO.get(doId);
    const baseUrl = new URL(c.req.url);
    const doUrl = `${baseUrl.origin}/stream`;
    
    const headers = new Headers();
    c.req.raw.headers.forEach((value: string, key: string) => {
      headers.set(key, value);
    });
    headers.set('accept', 'text/event-stream');

    const request = new Request(doUrl, {
      method: 'GET',
      headers,
    });

    return deploymentDOInstance.fetch(request);
  }
);

// Obtener estado del deployment
deploymentRoutes.get(
  '/:id/status',
  zValidator('param', DeploymentIdParamSchema),
  async (c: any) => {
    const { id } = c.req.valid('param');
    const deploymentDO = c.env.DEPLOYMENT_STATE;

    const doId = deploymentDO.idFromName(id);
    const deploymentDOInstance = deploymentDO.get(doId);
    const baseUrl = new URL(c.req.url);
    const doUrl = `${baseUrl.origin}/status`;
    
    const headers = new Headers();
    c.req.raw.headers.forEach((value: string, key: string) => {
      headers.set(key, value);
    });

    const request = new Request(doUrl, {
      method: 'GET',
      headers,
    });

    return deploymentDOInstance.fetch(request);
  }
);
