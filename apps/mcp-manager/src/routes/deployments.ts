import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { DeploymentIdParamSchema } from '../schemas/mcp.schema';

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
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;
  const mcpId = c.req.query('mcpId');

  let query = `
    SELECT d.*, ms.name as mcp_name, mv.version
    FROM deployments d
    JOIN mcp_servers ms ON d.mcp_id = ms.id
    JOIN mcp_versions mv ON d.version_id = mv.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (mcpId) {
    query += ' AND d.mcp_id = ?';
    params.push(mcpId);
  }

  query += ' ORDER BY d.started_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const { results } = await c.env.DB.prepare(query).bind(...params).all();

  const countQuery = mcpId
    ? 'SELECT COUNT(*) as count FROM deployments WHERE mcp_id = ?'
    : 'SELECT COUNT(*) as count FROM deployments';
  
  const countParams = mcpId ? [mcpId] : [];
  const { count } = await c.env.DB.prepare(countQuery).bind(...countParams).first() as { count: number };

  return c.json({
    data: results,
    pagination: {
      page,
      limit,
      total: count,
      pages: Math.ceil(count / limit),
    },
  });
});

// Obtener deployment por ID
deploymentRoutes.get(
  '/:id',
  zValidator('param', DeploymentIdParamSchema),
  async (c: any) => {
    const { id } = c.req.valid('param');
    
    const deployment = await c.env.DB.prepare(`
      SELECT d.*, ms.name as mcp_name, mv.version, mv.bundle_key
      FROM deployments d
      JOIN mcp_servers ms ON d.mcp_id = ms.id
      JOIN mcp_versions mv ON d.version_id = mv.id
      WHERE d.id = ?
    `).bind(id).first();

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

