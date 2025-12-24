/**
 * Template para generar Workers MCP
 */

export const MCP_WORKER_TEMPLATE = `
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// === USER CODE INJECTION POINT ===
{{USER_TOOLS}}

// === GENERATED MCP SERVER ===
type Env = {
  {{BINDINGS}}
};

export class MyMcp extends McpAgent<Env> {
  server = new McpServer({
    name: "{{MCP_NAME}}",
    version: "{{MCP_VERSION}}",
  });

  async init() {
    {{TOOL_REGISTRATIONS}}
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    {{AUTH_MIDDLEWARE}}
    
    if (url.pathname === "/sse" || url.pathname === "/mcp") {
      // MCP SSE endpoint
      return MyMcp.serveSSE("/sse").fetch(request, env, ctx);
    }
    
    return new Response("MCP Server", { status: 200 });
  },
};
`;

export const AUTH_TEMPLATES = {
  public: `
    // Public access - no authentication required
  `,
  
  api_key: `
    const apiKey = request.headers.get("X-API-Key") || url.searchParams.get("api_key");
    if (!apiKey || apiKey !== env.MCP_API_KEY) {
      return new Response("Unauthorized", { status: 401 });
    }
  `,
  
  oauth: `
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }
    const token = authHeader.slice(7);
    const isValid = await validateOAuthToken(token, env);
    if (!isValid) {
      return new Response("Invalid token", { status: 403 });
    }
  `,
};

