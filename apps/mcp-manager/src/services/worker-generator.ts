const MCP_WORKER_TEMPLATE = `
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

const AUTH_HELPERS = `
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
      const requiredScopes = JSON.parse(env.OAUTH_SCOPES) as string[];
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

const AUTH_TEMPLATES = {
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

interface McpConfig {
  name: string;
  version: string;
  tools: Tool[];
  bindings?: Bindings;
  authType: 'public' | 'api_key' | 'oauth';
}

interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  handler: string;
}

interface Bindings {
  d1?: string[];
  kv?: string[];
  r2?: string[];
  secrets?: string[];
}

export class WorkerGenerator {
  generateWorkerScript(config: McpConfig): string {
    if (!config.name || !config.version || !config.authType) {
      throw new Error('Invalid MCP configuration provided to WorkerGenerator');
    }

    let script = MCP_WORKER_TEMPLATE;

    // Reemplazar placeholders
    script = script.replace('{{MCP_NAME}}', config.name);
    script = script.replace('{{MCP_VERSION}}', config.version);

    // Generar código de tools
    const toolsCode = this.generateToolsCode(config.tools);
    script = script.replace('{{USER_TOOLS}}', toolsCode);

    // Generar registraciones de tools
    const registrations = this.generateToolRegistrations(config.tools);
    script = script.replace('{{TOOL_REGISTRATIONS}}', registrations);

    // Agregar middleware de autenticación
    const authMiddleware = AUTH_TEMPLATES[config.authType];
    script = script.replace('{{AUTH_MIDDLEWARE}}', authMiddleware);
    script = script.replace('{{AUTH_HELPERS}}', AUTH_HELPERS);

    return script;
  }

  private generateToolsCode(tools: Tool[]): string {
    return tools.map(tool => {
      const safeName = this.toSafeIdentifier(tool.name);
      const normalizedHandler = tool.handler ? this.normalizeHandlerBody(tool.handler) : '';
      const handlerBody = normalizedHandler ? this.indent(normalizedHandler, 2) : '';
      const schemaCode = this.generateZodSchema(tool.inputSchema);
      return `
// Tool: ${tool.name}
async function ${safeName}Handler(params, env) {
${handlerBody || '  // TODO: implement handler'}
}

const ${safeName}Schema = ${schemaCode};
`;
    }).join('\n');
  }

  private generateToolRegistrations(tools: Tool[]): string {
    return tools.map(tool => {
      const safeName = this.toSafeIdentifier(tool.name);
      return `
    this.server.tool(
      ${JSON.stringify(tool.name)},
      ${JSON.stringify(tool.description)},
      ${safeName}Schema,
      async (params) => ${safeName}Handler(params, this.env)
    );
`;
    }).join('\n');
  }

  private toSafeIdentifier(name: string): string {
    const normalized = name.replace(/[^a-zA-Z0-9_]/g, '_');
    if (!normalized) {
      return 'tool';
    }
    if (/^[0-9]/.test(normalized)) {
      return `tool_${normalized}`;
    }
    return normalized;
  }

  private normalizeHandlerBody(handler: string): string {
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

    const extracted = this.extractFunctionBody(trimmed);
    return extracted ?? trimmed;
  }

  private extractFunctionBody(source: string): string | null {
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

  private indent(value: string, level: number): string {
    const pad = ' '.repeat(level);
    return value
      .split('\n')
      .map((line) => (line ? `${pad}${line}` : line))
      .join('\n');
  }

  private generateZodSchema(schema: Record<string, any>): string {
    if (!schema || typeof schema !== 'object') {
      return 'z.any()';
    }

    const type = schema.type;

    if (type === 'object' || schema.properties) {
      const properties = schema.properties || {};
      const required = new Set<string>(schema.required || []);
      const entries = Object.entries(properties).map(([key, value]) => {
        const propertySchema = this.generateZodSchema(value as Record<string, any>);
        const maybeOptional = required.has(key) ? propertySchema : `${propertySchema}.optional()`;
        return `${JSON.stringify(key)}: ${maybeOptional}`;
      });
      return `z.object({ ${entries.join(', ')} })`;
    }

    if (type === 'string') {
      if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
        const values = schema.enum.map((item: string) => JSON.stringify(item)).join(', ');
        return `z.enum([${values}])`;
      }
      let zod = 'z.string()';
      if (schema.minLength !== undefined) zod += `.min(${schema.minLength})`;
      if (schema.maxLength !== undefined) zod += `.max(${schema.maxLength})`;
      if (schema.pattern) zod += `.regex(new RegExp(${JSON.stringify(schema.pattern)}))`;
      if (schema.format === 'email') zod += '.email()';
      if (schema.format === 'uri') zod += '.url()';
      if (schema.format === 'uuid') zod += '.uuid()';
      return zod;
    }

    if (type === 'number' || type === 'integer') {
      let zod = type === 'integer' ? 'z.number().int()' : 'z.number()';
      if (schema.minimum !== undefined) zod += `.min(${schema.minimum})`;
      if (schema.maximum !== undefined) zod += `.max(${schema.maximum})`;
      if (schema.multipleOf !== undefined) zod += `.multipleOf(${schema.multipleOf})`;
      return zod;
    }

    if (type === 'boolean') {
      return 'z.boolean()';
    }

    if (type === 'array') {
      const itemSchema = this.generateZodSchema(schema.items || {});
      let zod = `z.array(${itemSchema})`;
      if (schema.minItems !== undefined) zod += `.min(${schema.minItems})`;
      if (schema.maxItems !== undefined) zod += `.max(${schema.maxItems})`;
      if (schema.uniqueItems) {
        zod += `.refine((items) => new Set(items).size === items.length, { message: "Array items must be unique" })`;
      }
      return zod;
    }

    return 'z.any()';
  }
}

