import { z } from 'zod';

const BindingNameSchema = z.string().min(1);
const D1BindingSchema = z.union([
  BindingNameSchema,
  z.object({
    name: z.string().min(1),
    databaseId: z.string().min(1).optional(),
  }),
]);
const KvBindingSchema = z.union([
  BindingNameSchema,
  z.object({
    name: z.string().min(1),
    namespaceId: z.string().min(1).optional(),
  }),
]);
const R2BindingSchema = z.union([
  BindingNameSchema,
  z.object({
    name: z.string().min(1),
    bucketName: z.string().min(1).optional(),
  }),
]);
const BindingsSchema = z.object({
  d1: z.array(D1BindingSchema).optional(),
  kv: z.array(KvBindingSchema).optional(),
  r2: z.array(R2BindingSchema).optional(),
  secrets: z.array(z.string().min(1)).optional(),
}).optional();

export const McpCreateSchema = z.object({
  name: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  authType: z.enum(['public', 'api_key', 'oauth']),
  bindings: BindingsSchema,
  authConfig: z.object({
    apiKey: z.string().optional(),
    oauthProvider: z.string().optional(),
    oauthClientId: z.string().optional(),
    oauthClientSecret: z.string().optional(),
    oauthIntrospectionUrl: z.string().url().optional(),
    scopes: z.array(z.string()).optional(),
  }).optional(),
});

export const McpUpdateSchema = McpCreateSchema.partial();

export const VersionCreateSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  sourceCode: z.string().min(10),
  changelog: z.string().optional(),
  tools: z.array(z.object({
    name: z.string(),
    description: z.string(),
    inputSchema: z.record(z.any()),
    handler: z.string(),
  })),
  bindings: BindingsSchema,
});

export const DeploymentIdParamSchema = z.object({
  id: z.string().uuid(),
});
