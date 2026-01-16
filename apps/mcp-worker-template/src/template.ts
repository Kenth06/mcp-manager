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
{{AUTH_HELPERS}}

export class MyMcp extends McpAgent {
  server = new McpServer({
    name: "{{MCP_NAME}}",
    version: "{{MCP_VERSION}}",
  });

  async init() {
    {{TOOL_REGISTRATIONS}}
  }
}

export default {
  async fetch(request, env, ctx) {
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

export const AUTH_HELPERS = `
async function hashApiKey(apiKey) {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function validateOAuthToken(token, env) {
  if (!env.OAUTH_INTROSPECTION_URL || !env.OAUTH_CLIENT_ID || !env.OAUTH_CLIENT_SECRET) {
    return false;
  }

  const body = new URLSearchParams({
    token,
    client_id: env.OAUTH_CLIENT_ID,
    client_secret: env.OAUTH_CLIENT_SECRET,
  });

  const response = await fetch(env.OAUTH_INTROSPECTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    return false;
  }

  const data = await response.json();
  if (!data?.active) {
    return false;
  }

  if (env.OAUTH_SCOPES && data.scope) {
    try {
      const requiredScopes = JSON.parse(env.OAUTH_SCOPES);
      if (Array.isArray(requiredScopes) && requiredScopes.length > 0) {
        const grantedScopes = new Set(data.scope.split(" "));
        return requiredScopes.every((scope) => grantedScopes.has(scope));
      }
    } catch {
      return false;
    }
  }

  return true;
}
`;

export const AUTH_TEMPLATES = {
  public: `
    // Public access - no authentication required
  `,
  
  api_key: `
    const apiKey = request.headers.get("X-API-Key") || url.searchParams.get("api_key");
    if (!apiKey || !env.MCP_API_KEY_HASH) {
      return new Response("Unauthorized", { status: 401 });
    }
    const apiKeyHash = await hashApiKey(apiKey);
    if (apiKeyHash !== env.MCP_API_KEY_HASH) {
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
      return new Response("Unauthorized", { status: 401 });
    }
  `,
};
