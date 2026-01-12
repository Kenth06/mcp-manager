'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMcpById } from '@/lib/hooks/useMcp';
import { useVersions, useRollback } from '@/lib/hooks/useVersions';
import { useTools } from '@/lib/hooks/useTools';
import { usePublish } from '@/lib/hooks/usePublish';
import { Card, Badge, Button, Loader, DetailsList, DateDisplay, Alert, ConfirmModal } from '@/components/ui';
import { PageHeader } from '@/components/common';
import { ToolsList } from '@/components/tools/ToolsList';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Trash2, RotateCcw } from 'lucide-react';
import { toast } from '@/stores';

export default function McpDetailPage() {
  const params = useParams();
  const router = useRouter();
  const mcpId = params.id as string;

  const [publishingVersion, setPublishingVersion] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [rollbackVersion, setRollbackVersion] = useState<string | null>(null);
  const [showRollbackModal, setShowRollbackModal] = useState(false);

  const { mcp, loading: mcpLoading, error: mcpError, refetch: refetchMcp } = useMcpById(mcpId);
  const { versions, loading: versionsLoading, refetch: refetchVersions } = useVersions(mcpId);
  const { tools, loading: toolsLoading, updateTools } = useTools(mcpId);

  const { publish, loading: publishLoading } = usePublish({
    onSuccess: (response) => {
      router.push(`/deployments/${response.deploymentId}`);
    },
    onError: (error) => {
      setPublishError(error.message);
      setPublishingVersion(null);
    },
  });

  const { rollback, loading: rollbackLoading } = useRollback({
    onSuccess: (version) => {
      toast.success('Rollback Successful', `Rolled back to version ${version}`);
      setShowRollbackModal(false);
      setRollbackVersion(null);
      refetchVersions();
      refetchMcp();
    },
    onError: (error) => {
      toast.error('Rollback Failed', error.message);
      setShowRollbackModal(false);
      setRollbackVersion(null);
    },
  });

  const handlePublish = async (version: string) => {
    setPublishingVersion(version);
    setPublishError(null);
    try {
      await publish(mcpId, version);
    } catch {
      // Error handled in onError callback
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/api/mcp/${mcpId}`);
      router.push('/mcp');
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Failed to delete MCP');
      setShowDeleteModal(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRollbackClick = (version: string) => {
    setRollbackVersion(version);
    setShowRollbackModal(true);
  };

  const handleRollbackConfirm = async () => {
    if (!rollbackVersion) return;
    await rollback(mcpId, rollbackVersion);
  };

  // Check if there's an active version (needed to show rollback button)
  const hasActiveVersion = versions.some(v => v.is_active);

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
          primaryAction={{
            label: 'Edit MCP',
            onClick: () => router.push(`/mcp/${mcpId}/edit`),
          }}
        />

        {publishError && (
          <Alert
            variant="error"
            title="Error"
            className="mb-6"
            action={{
              label: 'Dismiss',
              onClick: () => setPublishError(null),
            }}
          >
            {publishError}
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          <div className="lg:col-span-3">
            <ToolsList
              tools={tools}
              onUpdate={updateTools}
              loading={toolsLoading}
            />
          </div>

          <div className="lg:col-span-1 space-y-4">
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
                <div>
                  <p className="text-xs text-gray-600 mb-1">Total Versions</p>
                  <p className="text-sm font-medium text-gray-900">{versions.length}</p>
                </div>
              </div>
            </Card>

            <Card className="ring ring-red-200 shadow-xs border border-red-200">
              <div className="p-4">
                <h3 className="text-sm font-semibold text-red-700 mb-2">Danger Zone</h3>
                <p className="text-xs text-gray-600 mb-3">
                  Permanently delete this MCP and all associated data.
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Delete MCP
                </Button>
              </div>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <Card className="ring ring-gray-950/10 shadow-xs border border-gray-200">
              <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Versions</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchVersions()}
                  disabled={versionsLoading}
                >
                  Refresh
                </Button>
              </div>
              <div className="p-4">
                {versionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader variant="inline" text="Loading versions..." />
                  </div>
                ) : versions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No versions yet</p>
                    <p className="text-xs mt-1 text-gray-400">Add tools to create your first version</p>
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
                            {version.last_deploy_status && (
                              <Badge
                                variant={
                                  version.last_deploy_status === 'completed' ? 'success' :
                                  version.last_deploy_status === 'failed' ? 'error' :
                                  'warning'
                                }
                                className="text-xs"
                              >
                                {version.last_deploy_status}
                              </Badge>
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
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handlePublish(version.version)}
                                disabled={publishLoading && publishingVersion === version.version}
                              >
                                {publishLoading && publishingVersion === version.version
                                  ? 'Publishing...'
                                  : 'Publish'}
                              </Button>
                              {hasActiveVersion && version.last_deploy_status === 'completed' && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleRollbackClick(version.version)}
                                  disabled={rollbackLoading}
                                  title="Rollback to this version"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </>
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
                      label: 'Endpoint',
                      value: mcp.endpoint_url ? (
                        <a
                          href={mcp.endpoint_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#056DFF] hover:underline text-xs break-all"
                        >
                          {mcp.endpoint_url}
                        </a>
                      ) : (
                        'Not deployed'
                      ),
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

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete MCP"
        message={`Are you sure you want to delete "${mcp.name}"? This action cannot be undone. All versions, deployments, and associated data will be permanently removed.`}
        confirmLabel="Delete MCP"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleteLoading}
      />

      <ConfirmModal
        isOpen={showRollbackModal}
        onClose={() => {
          setShowRollbackModal(false);
          setRollbackVersion(null);
        }}
        onConfirm={handleRollbackConfirm}
        title="Rollback Version"
        message={`Are you sure you want to rollback to version "${rollbackVersion}"? This will redeploy the worker with this version's configuration.`}
        confirmLabel="Rollback"
        cancelLabel="Cancel"
        variant="warning"
        loading={rollbackLoading}
      />
    </div>
  );
}
