import Link from 'next/link';
import { Button, Card } from '@/components/ui';

export default function Home() {
  return (
    <main className="container mx-auto p-8">
      <div className="text-center py-16">
        <h1 className="text-5xl font-bold mb-4 text-gray-900">MCP Control Plane</h1>
        <p className="text-xl text-gray-600 mb-8">
          Sistema de gestión centralizada para MCP Servers en Cloudflare Workers
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/mcp">
            <Button variant="primary" size="lg">
              View MCP Servers
            </Button>
          </Link>
          <Link href="/mcp/new">
            <Button variant="secondary" size="lg">
              Create New MCP
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Manage MCPs</h3>
          <p className="text-gray-600 text-sm">
            Create, update, and manage your Model Context Protocol servers
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Version Control</h3>
          <p className="text-gray-600 text-sm">
            Track versions, manage deployments, and rollback when needed
          </p>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">Real-time Monitoring</h3>
          <p className="text-gray-600 text-sm">
            Monitor deployment progress with real-time logs and status updates
          </p>
        </Card>
      </div>
    </main>
  );
}





