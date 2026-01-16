import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, count, desc, eq, isNull, max } from 'drizzle-orm';
import { McpCreateSchema, McpUpdateSchema } from '../schemas/mcp.schema';
import { createDb } from '../db';
import { mcpAuthConfigs, mcpServers, mcpVersions } from '../db/schema';

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
  const db = createDb(c.env.DB);
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  const versionCounts = db
    .select({
      mcpId: mcpVersions.mcpId,
      version_count: count(),
    })
    .from(mcpVersions)
    .groupBy(mcpVersions.mcpId)
    .as('version_counts');

  const lastDeployed = db
    .select({
      mcpId: mcpVersions.mcpId,
      last_deployed: max(mcpVersions.deployedAt),
    })
    .from(mcpVersions)
    .where(eq(mcpVersions.isActive, 1))
    .groupBy(mcpVersions.mcpId)
    .as('last_deployed');

  const rows = await db
    .select({
      id: mcpServers.id,
      name: mcpServers.name,
      description: mcpServers.description,
      auth_type: mcpServers.authType,
      current_version: mcpServers.currentVersion,
      worker_name: mcpServers.workerName,
      endpoint_url: mcpServers.endpointUrl,
      bindings: mcpServers.bindings,
      created_at: mcpServers.createdAt,
      updated_at: mcpServers.updatedAt,
      deleted_at: mcpServers.deletedAt,
      version_count: versionCounts.version_count,
      last_deployed: lastDeployed.last_deployed,
    })
    .from(mcpServers)
    .leftJoin(versionCounts, eq(mcpServers.id, versionCounts.mcpId))
    .leftJoin(lastDeployed, eq(mcpServers.id, lastDeployed.mcpId))
    .where(isNull(mcpServers.deletedAt))
    .orderBy(desc(mcpServers.updatedAt))
    .limit(limit)
    .offset(offset);

  const results = rows.map((row) => ({
    ...row,
    version_count: Number(row.version_count ?? 0),
    last_deployed: row.last_deployed ?? null,
    bindings: row.bindings ? safeJsonParse(row.bindings as string) : null,
  }));

  const totalRows = await db
    .select({ count: count() })
    .from(mcpServers)
    .where(isNull(mcpServers.deletedAt));
  const total = Number(totalRows[0]?.count ?? 0);

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

// Crear nuevo MCP
mcpRoutes.post('/', zValidator('json', McpCreateSchema), async (c: any) => {
  const db = createDb(c.env.DB);
  const body = c.req.valid('json');
  const id = crypto.randomUUID();
  const now = Date.now();
  const bindings = body.bindings ? JSON.stringify(normalizeBindings(body.bindings)) : null;

  if (body.authType === 'oauth' && !body.authConfig?.oauthIntrospectionUrl) {
    return c.json({ error: 'oauthIntrospectionUrl is required for oauth auth type' }, 400);
  }

  await db.insert(mcpServers).values({
    id,
    name: body.name,
    description: body.description || null,
    authType: body.authType,
    bindings,
    createdAt: now,
    updatedAt: now,
  });

  // Guardar config de auth si existe
  if (body.authConfig) {
    const apiKeyHash = body.authConfig.apiKey
      ? await hashApiKey(body.authConfig.apiKey)
      : null;

    await db.insert(mcpAuthConfigs).values({
      id: crypto.randomUUID(),
      mcpId: id,
      authType: body.authType,
      apiKeyHash,
      oauthClientId: body.authConfig.oauthClientId || null,
      oauthClientSecret: body.authConfig.oauthClientSecret || null,
      oauthProvider: body.authConfig.oauthProvider || null,
      oauthIntrospectionUrl: body.authConfig.oauthIntrospectionUrl || null,
      scopes: body.authConfig.scopes ? JSON.stringify(body.authConfig.scopes) : null,
    });
  }

  return c.json({ id, name: body.name }, 201);
});

// Obtener MCP por ID
mcpRoutes.get('/:id', async (c: any) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');

  const rows = await db
    .select({
      id: mcpServers.id,
      name: mcpServers.name,
      description: mcpServers.description,
      auth_type: mcpServers.authType,
      current_version: mcpServers.currentVersion,
      worker_name: mcpServers.workerName,
      endpoint_url: mcpServers.endpointUrl,
      bindings: mcpServers.bindings,
      created_at: mcpServers.createdAt,
      updated_at: mcpServers.updatedAt,
      deleted_at: mcpServers.deletedAt,
      auth_config_type: mcpAuthConfigs.authType,
      api_key_hash: mcpAuthConfigs.apiKeyHash,
      oauth_provider: mcpAuthConfigs.oauthProvider,
      oauth_client_id: mcpAuthConfigs.oauthClientId,
      oauth_client_secret: mcpAuthConfigs.oauthClientSecret,
      oauth_introspection_url: mcpAuthConfigs.oauthIntrospectionUrl,
      scopes: mcpAuthConfigs.scopes,
    })
    .from(mcpServers)
    .leftJoin(mcpAuthConfigs, eq(mcpServers.id, mcpAuthConfigs.mcpId))
    .where(and(eq(mcpServers.id, id), isNull(mcpServers.deletedAt)))
    .limit(1);

  const mcp = rows[0];

  if (!mcp) {
    return c.json({ error: 'MCP not found' }, 404);
  }

  // Obtener versiones
  const versions = await db
    .select()
    .from(mcpVersions)
    .where(eq(mcpVersions.mcpId, id))
    .orderBy(desc(mcpVersions.createdAt))
    .limit(10);
  const serializedVersions = versions.map((versionRow) => ({
    id: versionRow.id,
    mcp_id: versionRow.mcpId,
    version: versionRow.version,
    bundle_key: versionRow.bundleKey,
    changelog: versionRow.changelog,
    config_snapshot: versionRow.configSnapshot,
    is_active: versionRow.isActive,
    deployed_at: versionRow.deployedAt,
    created_at: versionRow.createdAt,
  }));

  const response = {
    ...mcp,
    has_api_key: Boolean(mcp.api_key_hash),
    has_oauth_secret: Boolean(mcp.oauth_client_secret),
    oauth_scopes: mcp.scopes ? safeJsonParse(mcp.scopes) : null,
    bindings: mcp.bindings ? safeJsonParse(mcp.bindings as string) : null,
  };
  delete (response as { api_key_hash?: string }).api_key_hash;
  delete (response as { oauth_client_secret?: string }).oauth_client_secret;
  delete (response as { scopes?: string }).scopes;

  return c.json({ ...response, versions: serializedVersions });
});

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeBindings(bindings: any): {
  d1?: Array<{ name: string; databaseId?: string }>;
  kv?: Array<{ name: string; namespaceId?: string }>;
  r2?: Array<{ name: string; bucketName?: string }>;
  secrets?: string[];
} {
  if (!bindings || typeof bindings !== 'object') {
    return {};
  }

  const normalizeArray = (
    items: Array<string | Record<string, string>> | undefined,
    key: 'databaseId' | 'namespaceId' | 'bucketName'
  ) => {
    if (!items) return undefined;
    return items
      .map((item) => {
        if (typeof item === 'string') {
          return { name: item };
        }
        if (item && typeof item === 'object' && 'name' in item) {
          const value = (item as Record<string, string>)[key];
          return value ? { name: String(item.name), [key]: String(value) } : { name: String(item.name) };
        }
        return null;
      })
      .filter(Boolean) as Array<{ name: string; [k: string]: string }>;
  };

  return {
    d1: normalizeArray(bindings.d1, 'databaseId'),
    kv: normalizeArray(bindings.kv, 'namespaceId'),
    r2: normalizeArray(bindings.r2, 'bucketName'),
    secrets: Array.isArray(bindings.secrets)
      ? bindings.secrets.map((item: string) => String(item)).filter(Boolean)
      : undefined,
  };
}

// Actualizar MCP
mcpRoutes.patch('/:id', zValidator('json', McpUpdateSchema), async (c: any) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');
  const body = c.req.valid('json');

  const existingRows = await db
    .select({
      id: mcpServers.id,
      authType: mcpServers.authType,
    })
    .from(mcpServers)
    .where(and(eq(mcpServers.id, id), isNull(mcpServers.deletedAt)))
    .limit(1);
  const existingMcp = existingRows[0];

  if (!existingMcp) {
    return c.json({ error: 'MCP not found' }, 404);
  }

  const updates: Record<string, unknown> = { updatedAt: Date.now() };

  if (body.name) {
    updates.name = body.name;
  }
  if (body.description !== undefined) {
    updates.description = body.description;
  }
  if (body.authType) {
    updates.authType = body.authType;
  }
  if (body.bindings) {
    updates.bindings = JSON.stringify(normalizeBindings(body.bindings));
  }

  await db
    .update(mcpServers)
    .set(updates)
    .where(eq(mcpServers.id, id));

  if (body.authType || body.authConfig) {
    const authRows = await db
      .select()
      .from(mcpAuthConfigs)
      .where(eq(mcpAuthConfigs.mcpId, id))
      .limit(1);
    const existingAuth = authRows[0];
    const newAuthType = body.authType ?? existingMcp.authType;

    if (newAuthType === 'public' && !body.authConfig) {
      if (existingAuth) {
        await db.delete(mcpAuthConfigs).where(eq(mcpAuthConfigs.mcpId, id));
      }
      return c.json({ success: true });
    }

    if (newAuthType === 'api_key' && !body.authConfig?.apiKey && !existingAuth?.apiKeyHash) {
      return c.json({ error: 'API key is required for api_key auth type' }, 400);
    }

    if (newAuthType === 'oauth') {
      const missingClientId = !body.authConfig?.oauthClientId && !existingAuth?.oauthClientId;
      const missingClientSecret = !body.authConfig?.oauthClientSecret && !existingAuth?.oauthClientSecret;
      const missingIntrospectionUrl = !body.authConfig?.oauthIntrospectionUrl && !existingAuth?.oauthIntrospectionUrl;
      if (missingClientId || missingClientSecret || missingIntrospectionUrl) {
        return c.json({ error: 'OAuth client ID, secret, and introspection URL are required for oauth auth type' }, 400);
      }
    }

    const nextAuth = {
      authType: newAuthType,
      apiKeyHash: newAuthType === 'api_key'
        ? (body.authConfig?.apiKey ? await hashApiKey(body.authConfig.apiKey) : existingAuth?.apiKeyHash ?? null)
        : null,
      oauthProvider: newAuthType === 'oauth'
        ? (body.authConfig?.oauthProvider ?? existingAuth?.oauthProvider ?? null)
        : null,
      oauthClientId: newAuthType === 'oauth'
        ? (body.authConfig?.oauthClientId ?? existingAuth?.oauthClientId ?? null)
        : null,
      oauthClientSecret: newAuthType === 'oauth'
        ? (body.authConfig?.oauthClientSecret ?? existingAuth?.oauthClientSecret ?? null)
        : null,
      oauthIntrospectionUrl: newAuthType === 'oauth'
        ? (body.authConfig?.oauthIntrospectionUrl ?? existingAuth?.oauthIntrospectionUrl ?? null)
        : null,
      scopes: newAuthType === 'oauth'
        ? (body.authConfig?.scopes ? JSON.stringify(body.authConfig.scopes) : existingAuth?.scopes ?? null)
        : null,
    };

    if (existingAuth) {
      await db
        .update(mcpAuthConfigs)
        .set(nextAuth)
        .where(eq(mcpAuthConfigs.id, existingAuth.id));
    } else {
      await db.insert(mcpAuthConfigs).values({
        id: crypto.randomUUID(),
        mcpId: id,
        ...nextAuth,
      });
    }
  }

  return c.json({ success: true });
});

// Soft delete
mcpRoutes.delete('/:id', async (c: any) => {
  const db = createDb(c.env.DB);
  const id = c.req.param('id');

  await db
    .update(mcpServers)
    .set({ deletedAt: Date.now() })
    .where(eq(mcpServers.id, id));

  return c.json({ success: true });
});

async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
