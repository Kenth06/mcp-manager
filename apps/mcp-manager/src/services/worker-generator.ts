const MCP_WORKER_TEMPLATE = `
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

const AUTH_TEMPLATES = {
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

    // Generar bindings type
    const bindingsType = this.generateBindingsType(config.bindings || {});
    script = script.replace('{{BINDINGS}}', bindingsType);

    // Generar código de tools
    const toolsCode = this.generateToolsCode(config.tools);
    script = script.replace('{{USER_TOOLS}}', toolsCode);

    // Generar registraciones de tools
    const registrations = this.generateToolRegistrations(config.tools);
    script = script.replace('{{TOOL_REGISTRATIONS}}', registrations);

    // Agregar middleware de autenticación
    const authMiddleware = AUTH_TEMPLATES[config.authType];
    script = script.replace('{{AUTH_MIDDLEWARE}}', authMiddleware);

    return script;
  }

  private generateBindingsType(bindings: Bindings): string {
    const lines: string[] = [];

    if (bindings.d1) {
      bindings.d1.forEach(name => {
        lines.push(`  ${name}: D1Database;`);
      });
    }

    if (bindings.kv) {
      bindings.kv.forEach(name => {
        lines.push(`  ${name}: KVNamespace;`);
      });
    }

    if (bindings.r2) {
      bindings.r2.forEach(name => {
        lines.push(`  ${name}: R2Bucket;`);
      });
    }

    if (bindings.secrets) {
      bindings.secrets.forEach(name => {
        lines.push(`  ${name}: string;`);
      });
    }

    return lines.join('\n');
  }

  private generateToolsCode(tools: Tool[]): string {
    return tools.map(tool => `
// Tool: ${tool.name}
async function ${tool.name}Handler(params: z.infer<typeof ${tool.name}Schema>, env: Env) {
  ${tool.handler}
}

const ${tool.name}Schema = z.object(${JSON.stringify(tool.inputSchema)});
`).join('\n');
  }

  private generateToolRegistrations(tools: Tool[]): string {
    return tools.map(tool => `
    this.server.tool(
      "${tool.name}",
      "${tool.description}",
      ${tool.name}Schema,
      async (params) => ${tool.name}Handler(params, this.env)
    );
`).join('\n');
  }
}





