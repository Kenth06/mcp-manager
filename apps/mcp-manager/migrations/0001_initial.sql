-- MCP Servers table
CREATE TABLE IF NOT EXISTS mcp_servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  auth_type TEXT NOT NULL CHECK(auth_type IN ('public', 'api_key', 'oauth')),
  current_version TEXT,
  worker_name TEXT,
  endpoint_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

-- MCP Versions table
CREATE TABLE IF NOT EXISTS mcp_versions (
  id TEXT PRIMARY KEY,
  mcp_id TEXT NOT NULL,
  version TEXT NOT NULL,
  bundle_key TEXT NOT NULL,
  changelog TEXT,
  config_snapshot TEXT NOT NULL,
  is_active INTEGER DEFAULT 0,
  deployed_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (mcp_id) REFERENCES mcp_servers(id),
  UNIQUE(mcp_id, version)
);

-- Deployments table
CREATE TABLE IF NOT EXISTS deployments (
  id TEXT PRIMARY KEY,
  mcp_id TEXT NOT NULL,
  version_id TEXT NOT NULL,
  operation_type TEXT NOT NULL CHECK(operation_type IN ('publish', 'rollback', 'delete')),
  status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'failed')),
  worker_name TEXT,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  error_message TEXT,
  FOREIGN KEY (mcp_id) REFERENCES mcp_servers(id),
  FOREIGN KEY (version_id) REFERENCES mcp_versions(id)
);

-- MCP Auth Configs table
CREATE TABLE IF NOT EXISTS mcp_auth_configs (
  id TEXT PRIMARY KEY,
  mcp_id TEXT NOT NULL,
  auth_type TEXT NOT NULL,
  api_key_hash TEXT,
  oauth_provider TEXT,
  oauth_client_id TEXT,
  oauth_client_secret TEXT,
  scopes TEXT,
  FOREIGN KEY (mcp_id) REFERENCES mcp_servers(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mcp_versions_mcp_id ON mcp_versions(mcp_id);
CREATE INDEX IF NOT EXISTS idx_mcp_versions_active ON mcp_versions(mcp_id, is_active);
CREATE INDEX IF NOT EXISTS idx_deployments_mcp_id ON deployments(mcp_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_deleted ON mcp_servers(deleted_at);



