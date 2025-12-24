'use client';

import { useParams } from 'next/navigation';
import { useMcpById } from '@/lib/hooks/useMcp';
import { useVersions } from '@/lib/hooks/useVersions';
import { useTools } from '@/lib/hooks/useTools';
import { Card, Badge, Button, Loader, DetailsList, DateDisplay } from '@/components/ui';
import { PageHeader } from '@/components/common';
import { ToolsList } from '@/components/tools/ToolsList';
import Link from 'next/link';

export default function McpDetailPage() {
  const params = useParams();
  const mcpId = params.id as string;
  
  const { mcp, loading: mcpLoading, error: mcpError } = useMcpById(mcpId);
  const { versions, loading: versionsLoading } = useVersions(mcpId);
  const { tools, loading: toolsLoading, updateTools, version: toolsVersion } = useTools(mcpId);

  if (mcpLoading) {
    return (
      <main className="container mx-auto p-8">
        <Loader variant="overlay" text="Loading MCP..." />
      </main>
    );
  }

  if (mcpError || !mcp) {
    return (
      <main className="container mx-auto p-8">
        <Card className="p-6">
          <div className="text-center">
            <p className="text-red-700 mb-4">Error: {mcpError?.message || 'MCP not found'}</p>
            <Link href="/mcp">
              <Button variant="secondary">← Back to MCPs</Button>
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30 relative">
      <div className="relative z-10 w-full px-6 py-8">
        <Link href="/mcp" className="text-[#056DFF] hover:opacity-80 mb-6 inline-block no-underline text-sm">
          ← Back to MCPs
        </Link>

        <PageHeader
          title={mcp.name}
          description={mcp.description || 'Model Context Protocol Server'}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          <div className="lg:col-span-3">
            <ToolsList
              tools={tools}
              onUpdate={updateTools}
              loading={toolsLoading}
            />
          </div>
          
          <div className="lg:col-span-1">
            <Card className="ring ring-gray-950/10 shadow-xs border border-gray-200">
              <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                <h2 className="text-sm font-semibold text-gray-900">Quick Stats</h2>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Total Tools</p>
                  <p className="text-lg font-semibold text-gray-900">{tools.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Active Version</p>
                  <p className="text-sm font-medium text-gray-900">{mcp.current_version || 'None'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Auth Type</p>
                  <Badge variant={mcp.auth_type === 'public' ? 'success' : mcp.auth_type === 'api_key' ? 'info' : 'warning'} className="text-xs">
                    {mcp.auth_type}
                  </Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <Card className="ring ring-gray-950/10 shadow-xs border border-gray-200">
              <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                <h2 className="text-sm font-semibold text-gray-900">Versions</h2>
              </div>
              <div className="p-4">
                {versionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader variant="inline" text="Loading versions..." />
                  </div>
                ) : versions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No versions yet</p>
                    <p className="text-xs mt-1 text-gray-400">Create a version to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {versions.map((version) => (
                      <div
                        key={version.id}
                        className="border border-gray-200 rounded-lg p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">{version.version}</span>
                            {version.is_active && (
                              <Badge variant="success" className="text-xs">Active</Badge>
                            )}
                          </div>
                          {version.changelog && (
                            <p className="text-xs text-gray-600 line-clamp-1">{version.changelog}</p>
                          )}
                          {version.deployed_at && (
                            <p className="text-xs text-gray-500 mt-1">
                              Deployed: <DateDisplay date={version.deployed_at * 1000} />
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          {!version.is_active && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={async () => {
                                alert('Publish functionality coming soon');
                              }}
                            >
                              Publish
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div>
            <Card className="ring ring-gray-950/10 shadow-xs border border-gray-200">
              <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                <h2 className="text-sm font-semibold text-gray-900">MCP Details</h2>
              </div>
              <div className="p-0">
                <DetailsList
                  items={[
                    {
                      label: 'Auth Type',
                      value: <Badge variant={mcp.auth_type === 'public' ? 'success' : mcp.auth_type === 'api_key' ? 'info' : 'warning'}>
                        {mcp.auth_type}
                      </Badge>,
                    },
                    {
                      label: 'Current Version',
                      value: mcp.current_version || 'None',
                    },
                    {
                      label: 'Worker Name',
                      value: mcp.worker_name || 'Not deployed',
                    },
                    {
                      label: 'Created',
                      value: <DateDisplay date={mcp.created_at * 1000} />,
                    },
                    {
                      label: 'Updated',
                      value: <DateDisplay date={mcp.updated_at * 1000} />,
                    },
                  ]}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

