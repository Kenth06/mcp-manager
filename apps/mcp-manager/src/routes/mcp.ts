import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { McpCreateSchema, McpUpdateSchema } from '../schemas/mcp.schema';

type Bindings = {
  DB: D1Database;
  BUNDLES: R2Bucket;
  CACHE: KVNamespace;
  MCP_OPERATION: DurableObjectNamespace;
  DEPLOYMENT_STATE: DurableObjectNamespace;
  CF_API_TOKEN: string;
  CF_ACCOUNT_ID: string;
};

export const mcpRoutes = new Hono<{ Bindings: Bindings }>();

// Listar MCPs con paginación
mcpRoutes.get('/', async (c: any) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  const { results } = await c.env.DB.prepare(`
    SELECT
      ms.*,
      (SELECT COUNT(*) FROM mcp_versions WHERE mcp_id = ms.id) as version_count,
      (SELECT MAX(deployed_at) FROM mcp_versions WHERE mcp_id = ms.id AND is_active = 1) as last_deployed
    FROM mcp_servers ms
    WHERE deleted_at IS NULL
    ORDER BY updated_at DESC
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all();

  const { count } = await c.env.DB.prepare(`
    SELECT COUNT(*) as count FROM mcp_servers WHERE deleted_at IS NULL
  `).first() as { count: number };

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

// Crear nuevo MCP
mcpRoutes.post('/', zValidator('json', McpCreateSchema), async (c: any) => {
  const body = c.req.valid('json');
  const id = crypto.randomUUID();

  await c.env.DB.prepare(`
    INSERT INTO mcp_servers (id, name, description, auth_type)
    VALUES (?, ?, ?, ?)
  `).bind(id, body.name, body.description || null, body.authType).run();

  // Guardar config de auth si existe
  if (body.authConfig) {
    const apiKeyHash = body.authConfig.apiKey
      ? await hashApiKey(body.authConfig.apiKey)
      : null;

    await c.env.DB.prepare(`
      INSERT INTO mcp_auth_configs (id, mcp_id, auth_type, api_key_hash, oauth_client_id, oauth_client_secret, oauth_provider, scopes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      id,
      body.authType,
      apiKeyHash,
      body.authConfig.oauthClientId || null,
      body.authConfig.oauthClientSecret || null,
      body.authConfig.oauthProvider || null,
      body.authConfig.scopes ? JSON.stringify(body.authConfig.scopes) : null,
    ).run();
  }

  return c.json({ id, name: body.name }, 201);
});

// Obtener MCP por ID
mcpRoutes.get('/:id', async (c: any) => {
  const id = c.req.param('id');

  const mcp = await c.env.DB.prepare(`
    SELECT ms.*, mac.auth_type as auth_config_type, mac.oauth_provider
    FROM mcp_servers ms
    LEFT JOIN mcp_auth_configs mac ON ms.id = mac.mcp_id
    WHERE ms.id = ? AND ms.deleted_at IS NULL
  `).bind(id).first();

  if (!mcp) {
    return c.json({ error: 'MCP not found' }, 404);
  }

  // Obtener versiones
  const { results: versions } = await c.env.DB.prepare(`
    SELECT * FROM mcp_versions WHERE mcp_id = ? ORDER BY created_at DESC LIMIT 10
  `).bind(id).all();

  return c.json({ ...mcp, versions });
});

// Actualizar MCP
mcpRoutes.patch('/:id', zValidator('json', McpUpdateSchema), async (c: any) => {
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const updates: string[] = [];
  const values: any[] = [];

  if (body.name) {
    updates.push('name = ?');
    values.push(body.name);
  }
  if (body.description !== undefined) {
    updates.push('description = ?');
    values.push(body.description);
  }
  if (body.authType) {
    updates.push('auth_type = ?');
    values.push(body.authType);
  }

  updates.push('updated_at = ?');
  values.push(Date.now());
  values.push(id);

  await c.env.DB.prepare(`
    UPDATE mcp_servers SET ${updates.join(', ')} WHERE id = ?
  `).bind(...values).run();

  return c.json({ success: true });
});

// Soft delete
mcpRoutes.delete('/:id', async (c: any) => {
  const id = c.req.param('id');

  await c.env.DB.prepare(`
    UPDATE mcp_servers SET deleted_at = ? WHERE id = ?
  `).bind(Date.now(), id).run();

  return c.json({ success: true });
});

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}





