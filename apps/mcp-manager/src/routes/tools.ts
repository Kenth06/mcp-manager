import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

type Bindings = {
  DB: D1Database;
  BUNDLES: R2Bucket;
  CACHE: KVNamespace;
  MCP_OPERATION: DurableObjectNamespace;
  DEPLOYMENT_STATE: DurableObjectNamespace;
  CF_API_TOKEN: string;
  CF_ACCOUNT_ID: string;
};

export const toolsRoutes = new Hono<{ Bindings: Bindings }>();

const ToolSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  inputSchema: z.record(z.any()),
  handler: z.string().min(1),
});

const ToolsUpdateSchema = z.object({
  tools: z.array(ToolSchema),
});

// Obtener tools de un MCP (desde la versión activa o la última versión)
toolsRoutes.get('/:mcpId', async (c: any) => {
  const mcpId = c.req.param('mcpId');

  // Obtener la versión activa o la última versión
  const version = await c.env.DB.prepare(`
    SELECT config_snapshot, version, is_active
    FROM mcp_versions
    WHERE mcp_id = ?
    ORDER BY is_active DESC, created_at DESC
    LIMIT 1
  `).bind(mcpId).first();

  if (!version) {
    return c.json({ tools: [] });
  }

  try {
    const config = JSON.parse(version.config_snapshot as string);
    return c.json({
      tools: config.tools || [],
      version: version.version,
      isActive: version.is_active === 1,
    });
  } catch (error) {
    return c.json({ tools: [], error: 'Failed to parse config' }, 500);
  }
});

// Actualizar tools de un MCP (crea una nueva versión)
toolsRoutes.patch('/:mcpId', zValidator('json', ToolsUpdateSchema), async (c: any) => {
  const mcpId = c.req.param('mcpId');
  const body = c.req.valid('json');

  // Obtener el MCP
  const mcp = await c.env.DB.prepare(`
    SELECT * FROM mcp_servers WHERE id = ? AND deleted_at IS NULL
  `).bind(mcpId).first();

  if (!mcp) {
    return c.json({ error: 'MCP not found' }, 404);
  }

  // Obtener la versión actual para mantener bindings y otros datos
  const currentVersion = await c.env.DB.prepare(`
    SELECT config_snapshot, version
    FROM mcp_versions
    WHERE mcp_id = ? AND is_active = 1
    LIMIT 1
  `).bind(mcpId).first();

  let configSnapshot: any = {};
  if (currentVersion) {
    try {
      configSnapshot = JSON.parse(currentVersion.config_snapshot as string);
    } catch {
      configSnapshot = {};
    }
  }

  // Actualizar tools en el config snapshot
  configSnapshot.tools = body.tools;

  // Crear nueva versión con los tools actualizados
  const newVersion = currentVersion?.version 
    ? incrementVersion(currentVersion.version as string)
    : '1.0.0';

  const versionId = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO mcp_versions (id, mcp_id, version, bundle_key, config_snapshot, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    versionId,
    mcpId,
    newVersion,
    '', // bundle_key se actualizará cuando se publique
    JSON.stringify(configSnapshot),
    Date.now()
  ).run();

  return c.json({
    success: true,
    version: newVersion,
    versionId,
    tools: body.tools,
  });
});

function incrementVersion(version: string): string {
  const parts = version.split('.').map(Number);
  parts[2] = (parts[2] || 0) + 1;
  return parts.join('.');
}


