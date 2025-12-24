import { DurableObject } from 'cloudflare:workers';

interface DeploymentState {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  logs: DeploymentLog[];
  error?: string;
  startedAt?: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

interface DeploymentLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

interface DeploymentProgress {
  step: string;
  progress: number;
  message: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

type Env = Record<string, never>;

export class DeploymentStateDO extends DurableObject<Env> {
  private state: DeploymentState | null = null;
  private connections: Set<ReadableStreamDefaultController> = new Set();

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (
      pathname.endsWith('/stream') &&
      request.headers.get('accept') === 'text/event-stream'
    ) {
      return this.handleSSE(request);
    }

    if (pathname.endsWith('/initialize') && request.method === 'POST') {
      return this.handleInitialize(request);
    }

    if (pathname.endsWith('/status') && request.method === 'GET') {
      return this.handleStatus();
    }

    if (request.method === 'GET') {
      return this.handleStatus();
    }

    return new Response('Not Found', { status: 404 });
  }

  private async handleInitialize(request: Request): Promise<Response> {
    try {
      const body = await request.json<{ deploymentId: string }>();
      this.initialize(body.deploymentId);
      return Response.json({ success: true });
    } catch (error) {
      return Response.json(
        { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 400 }
      );
    }
  }

  private initialize(deploymentId: string): void {
    if (!this.state) {
      this.state = {
        id: deploymentId,
        status: 'pending',
        logs: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        startedAt: Date.now(),
      };
    }
  }

  private handleStatus(): Response {
    if (!this.state) {
      return Response.json({ error: 'No deployment found' }, { status: 404 });
    }
    return Response.json(this.state);
  }

  private handleSSE(request: Request): Response {
    const currentState = this.state;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start: (controller) => {
        this.connections.add(controller);

        // Send initial state
        if (currentState) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'state', data: currentState })}\n\n`)
          );
        }

        // Keepalive
        const keepaliveInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: keepalive\n\n`));
          } catch {
            clearInterval(keepaliveInterval);
            this.connections.delete(controller);
          }
        }, 30000);

        // Cleanup after 5 minutes
        setTimeout(() => {
          clearInterval(keepaliveInterval);
          this.connections.delete(controller);
          try {
            controller.close();
          } catch {
            // Already closed
          }
        }, 300000);
      },
      cancel: () => {
        this.connections.forEach(conn => {
          if (conn === this.connections.values().next().value) {
            this.connections.delete(conn);
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    });
  }

  private addLog(level: DeploymentLog['level'], message: string, data?: Record<string, unknown>): void {
    if (!this.state) {
      this.state = {
        id: crypto.randomUUID(),
        status: 'in_progress',
        logs: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        startedAt: Date.now(),
      };
    }
    
    const log: DeploymentLog = {
      timestamp: Date.now(),
      level,
      message,
      data,
    };
    
    this.state.logs.push(log);
    this.state.updatedAt = Date.now();
    
    this.broadcast({ type: 'log', data: log });
  }

  private addProgress(step: string, progress: number, message: string, data?: Record<string, unknown>): void {
    if (!this.state) {
      this.state = {
        id: crypto.randomUUID(),
        status: 'in_progress',
        logs: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        startedAt: Date.now(),
      };
    }

    const progressEvent: DeploymentProgress = {
      step,
      progress,
      message,
      timestamp: Date.now(),
      data,
    };

    this.broadcast({ type: 'progress', data: progressEvent });
  }

  private updateStatus(status: DeploymentState['status'], error?: string): void {
    if (!this.state) {
      this.state = {
        id: crypto.randomUUID(),
        status,
        logs: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    }
    
    this.state.status = status;
    this.state.updatedAt = Date.now();
    if (error) this.state.error = error;
    if (status === 'completed' || status === 'failed') {
      this.state.completedAt = Date.now();
    }
    
    this.broadcast({ type: 'status', data: { status, error } });
  }

  private broadcast(message: object): void {
    const payload = `data: ${JSON.stringify(message)}\n\n`;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(payload);

    for (const controller of this.connections) {
      try {
        controller.enqueue(encoded);
      } catch {
        this.connections.delete(controller);
      }
    }
  }
}

