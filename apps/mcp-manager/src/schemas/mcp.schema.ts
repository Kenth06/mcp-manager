import { z } from 'zod';

export const McpCreateSchema = z.object({
  name: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  authType: z.enum(['public', 'api_key', 'oauth']),
  authConfig: z.object({
    apiKey: z.string().optional(),
    oauthProvider: z.string().optional(),
    oauthClientId: z.string().optional(),
    oauthClientSecret: z.string().optional(),
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
  bindings: z.object({
    d1: z.array(z.string()).optional(),
    kv: z.array(z.string()).optional(),
    r2: z.array(z.string()).optional(),
    secrets: z.array(z.string()).optional(),
  }).optional(),
});

export const DeploymentIdParamSchema = z.object({
  id: z.string().uuid(),
});

