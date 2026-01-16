import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { BundleService } from '../services/bundle-service';
import { createDb } from '../db';
import { mcpServers, mcpVersions } from '../db/schema';

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
  const db = createDb(c.env.DB);
  const mcpId = c.req.param('mcpId');

  // Obtener la versión activa o la última versión
  const versionRows = await db
    .select({
      configSnapshot: mcpVersions.configSnapshot,
      version: mcpVersions.version,
      isActive: mcpVersions.isActive,
    })
    .from(mcpVersions)
    .where(eq(mcpVersions.mcpId, mcpId))
    .orderBy(desc(mcpVersions.isActive), desc(mcpVersions.createdAt))
    .limit(1);
  const version = versionRows[0];

  if (!version) {
    return c.json({ tools: [] });
  }

  try {
    const config = JSON.parse(version.configSnapshot as string);
    return c.json({
      tools: config.tools || [],
      version: version.version,
      isActive: version.isActive === 1,
    });
  } catch (error) {
    return c.json({ tools: [], error: 'Failed to parse config' }, 500);
  }
});

// Actualizar tools de un MCP (crea una nueva versión)
toolsRoutes.patch('/:mcpId', zValidator('json', ToolsUpdateSchema), async (c: any) => {
  const db = createDb(c.env.DB);
  const mcpId = c.req.param('mcpId');
  const body = c.req.valid('json');
  const normalizedTools = body.tools.map((tool) => ({
    ...tool,
    handler: normalizeHandlerBody(tool.handler),
  }));

  // Obtener el MCP
  const mcpRows = await db
    .select({ id: mcpServers.id, bindings: mcpServers.bindings })
    .from(mcpServers)
    .where(and(eq(mcpServers.id, mcpId), isNull(mcpServers.deletedAt)))
    .limit(1);
  const mcp = mcpRows[0];

  if (!mcp) {
    return c.json({ error: 'MCP not found' }, 404);
  }

  // Obtener la versión actual para mantener bindings y otros datos
  const currentVersionRows = await db
    .select({
      configSnapshot: mcpVersions.configSnapshot,
      version: mcpVersions.version,
    })
    .from(mcpVersions)
    .where(and(eq(mcpVersions.mcpId, mcpId), eq(mcpVersions.isActive, 1)))
    .limit(1);
  const currentVersion = currentVersionRows[0];

  let configSnapshot: any = {};
  if (currentVersion) {
    try {
      configSnapshot = JSON.parse(currentVersion.configSnapshot as string);
    } catch {
      configSnapshot = {};
    }
  } else if (mcp.bindings) {
    try {
      configSnapshot.bindings = JSON.parse(mcp.bindings);
    } catch {
      configSnapshot.bindings = {};
    }
  }

  // Actualizar tools en el config snapshot
  configSnapshot.tools = normalizedTools;

  // Crear nueva versión con los tools actualizados
  const bundleService = new BundleService(c.env.BUNDLES, c.env.DB);

  let baseVersion = currentVersion?.version;
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const newVersion = baseVersion ? incrementVersion(baseVersion) : '1.0.0';

    const sourceCode = JSON.stringify({
      tools: normalizedTools,
      bindings: configSnapshot.bindings || {},
      version: newVersion,
    }, null, 2);

    const bundle = await bundleService.createBundle(mcpId, newVersion, sourceCode);
    const versionId = crypto.randomUUID();

    try {
      await db.insert(mcpVersions).values({
        id: versionId,
        mcpId,
        version: newVersion,
        bundleKey: bundle.key,
        configSnapshot: JSON.stringify(configSnapshot),
        createdAt: Date.now(),
      });

      return c.json({
        success: true,
        version: newVersion,
        versionId,
        tools: body.tools,
        bundleKey: bundle.key,
        bundleSize: bundle.size,
      });
    } catch (error) {
      lastError = error;
      await bundleService.deleteBundle(bundle.key);

      if (!isUniqueConflict(error)) {
        throw error;
      }

      const latestRows = await db
        .select({ version: mcpVersions.version })
        .from(mcpVersions)
        .where(eq(mcpVersions.mcpId, mcpId))
        .orderBy(desc(mcpVersions.createdAt))
        .limit(1);
      baseVersion = latestRows[0]?.version;
    }
  }

  console.error('Failed to create new version after retries', lastError);
  return c.json({ error: 'Failed to create new version due to concurrent updates' }, 409);
});

function incrementVersion(version: string): string {
  const parts = version.split('.').map(Number);
  parts[2] = (parts[2] || 0) + 1;
  return parts.join('.');
}

function normalizeHandlerBody(handler: string): string {
  const trimmed = handler.trim();
  if (!trimmed) {
    return '';
  }

  const looksLikeFunction =
    /\bfunction\b/.test(trimmed) ||
    /=>\s*\{/.test(trimmed);

  if (!looksLikeFunction) {
    return trimmed;
  }

  const extracted = extractFunctionBody(trimmed);
  return extracted ?? trimmed;
}

function extractFunctionBody(source: string): string | null {
  const braceIndex = source.indexOf('{');
  if (braceIndex === -1) {
    return null;
  }

  let depth = 0;
  for (let i = braceIndex; i < source.length; i += 1) {
    const char = source[i];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) {
      return source.slice(braceIndex + 1, i).trim();
    }
  }

  return null;
}

function isUniqueConflict(error: unknown): boolean {
  if (error instanceof Error && typeof error.message === 'string') {
    return error.message.includes('UNIQUE constraint failed');
  }
  return false;
}
