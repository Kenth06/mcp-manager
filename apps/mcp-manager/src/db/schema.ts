import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const mcpServers = sqliteTable('mcp_servers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  authType: text('auth_type', { enum: ['public', 'api_key', 'oauth'] }).notNull(),
  currentVersion: text('current_version'),
  workerName: text('worker_name'),
  endpointUrl: text('endpoint_url'),
  bindings: text('bindings'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

export const mcpVersions = sqliteTable('mcp_versions', {
  id: text('id').primaryKey(),
  mcpId: text('mcp_id').notNull(),
  version: text('version').notNull(),
  bundleKey: text('bundle_key').notNull(),
  changelog: text('changelog'),
  configSnapshot: text('config_snapshot').notNull(),
  isActive: integer('is_active').default(0),
  deployedAt: integer('deployed_at'),
  createdAt: integer('created_at').notNull(),
});

export const deployments = sqliteTable('deployments', {
  id: text('id').primaryKey(),
  mcpId: text('mcp_id').notNull(),
  versionId: text('version_id').notNull(),
  operationType: text('operation_type', { enum: ['publish', 'rollback', 'delete'] }).notNull(),
  status: text('status', { enum: ['pending', 'in_progress', 'completed', 'failed'] }).notNull(),
  workerName: text('worker_name'),
  startedAt: integer('started_at').notNull(),
  completedAt: integer('completed_at'),
  errorMessage: text('error_message'),
});

export const mcpAuthConfigs = sqliteTable('mcp_auth_configs', {
  id: text('id').primaryKey(),
  mcpId: text('mcp_id').notNull(),
  authType: text('auth_type').notNull(),
  apiKeyHash: text('api_key_hash'),
  oauthProvider: text('oauth_provider'),
  oauthClientId: text('oauth_client_id'),
  oauthClientSecret: text('oauth_client_secret'),
  oauthIntrospectionUrl: text('oauth_introspection_url'),
  scopes: text('scopes'),
});

export type McpServer = typeof mcpServers.$inferSelect;
export type McpVersion = typeof mcpVersions.$inferSelect;
export type Deployment = typeof deployments.$inferSelect;
export type McpAuthConfig = typeof mcpAuthConfigs.$inferSelect;
