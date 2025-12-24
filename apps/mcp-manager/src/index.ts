import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { mcpRoutes } from './routes/mcp';
import { versionRoutes } from './routes/versions';
import { deploymentRoutes } from './routes/deployments';
import { toolsRoutes } from './routes/tools';
import { McpOperationDO } from './durable-objects/McpOperationDO';
import { DeploymentStateDO } from './durable-objects/DeploymentStateDO';

export { McpOperationDO, DeploymentStateDO };

type Bindings = {
  DB: D1Database;
  BUNDLES: R2Bucket;
  CACHE: KVNamespace;
  MCP_OPERATION: DurableObjectNamespace;
  DEPLOYMENT_STATE: DurableObjectNamespace;
  CF_API_TOKEN: string;
  CF_ACCOUNT_ID: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['https://mcp-dashboard.pages.dev', 'http://localhost:3000'],
  credentials: true,
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

// API Routes
app.route('/api/mcp', mcpRoutes);
app.route('/api/versions', versionRoutes);
app.route('/api/deployments', deploymentRoutes);
app.route('/api/tools', toolsRoutes);

// SSE endpoint para streaming de progreso de deployment
app.get('/api/deployments/:id/stream', async (c) => {
  const deploymentId = c.req.param('id');
  const id = c.env.DEPLOYMENT_STATE.idFromName(deploymentId);
  const stub = c.env.DEPLOYMENT_STATE.get(id);
  return stub.fetch(c.req.raw);
});

export default app;

