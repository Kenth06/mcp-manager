'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDeployments } from '@/lib/hooks/useDeployments';
import { Card, Badge, Button, Loader, DateDisplay, Alert } from '@/components/ui';
import { PageHeader } from '@/components/common';
import { SearchBar } from '@/components/common/SearchBar';
import Link from 'next/link';
import { ArrowRight, Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

export default function DeploymentsListPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { deployments, pagination, loading, error, refetch } = useDeployments({ page, limit: 20 });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'in_progress':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'in_progress':
        return 'warning';
      default:
        return 'info';
    }
  };

  const formatDuration = (startedAt: number, completedAt?: number) => {
    if (!completedAt) return 'In progress';
    const seconds = Math.round((completedAt - startedAt) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30 relative">
        <div className="relative z-10 w-full px-6 py-8">
          <Alert
            variant="error"
            title="Error loading deployments"
            action={{
              label: 'Retry',
              onClick: refetch,
            }}
          >
            {error.message}
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30 relative">
      <div className="relative z-10 w-full px-6 py-8">
        <Link href="/mcp" className="text-[#056DFF] hover:opacity-80 mb-6 inline-block no-underline text-sm">
          ← Back to MCPs
        </Link>

        <PageHeader
          title="Deployment History"
          description="View all deployment operations across your MCP servers"
        />

        <Card className="ring ring-gray-950/10 shadow-xs border border-gray-200">
          <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">All Deployments</h2>
              {pagination && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Showing {deployments.length} of {pagination.total} deployments
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={refetch}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>

          <div className="p-4">
            {loading && deployments.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader variant="inline" text="Loading deployments..." />
              </div>
            ) : deployments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Clock className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No deployments yet</p>
                <p className="text-xs mt-1 text-gray-400">
                  Publish a version to create your first deployment
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {deployments.map((deployment) => (
                  <div
                    key={deployment.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/deployments/${deployment.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${
                          deployment.status === 'completed' ? 'bg-green-100' :
                          deployment.status === 'failed' ? 'bg-red-100' :
                          deployment.status === 'in_progress' ? 'bg-blue-100' :
                          'bg-gray-100'
                        }`}>
                          {getStatusIcon(deployment.status)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {deployment.mcp_name || 'Unknown MCP'}
                            </span>
                            <Badge variant="info" className="text-xs">
                              v{deployment.version || 'N/A'}
                            </Badge>
                            <Badge
                              variant={deployment.operation_type === 'publish' ? 'success' : 'warning'}
                              className="text-xs"
                            >
                              {deployment.operation_type}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500">
                            <span className="font-mono">{deployment.id.substring(0, 8)}...</span>
                            {' · '}
                            <DateDisplay date={deployment.started_at} />
                            {deployment.completed_at && (
                              <>
                                {' · '}
                                Duration: {formatDuration(deployment.started_at, deployment.completed_at)}
                              </>
                            )}
                          </p>
                          {deployment.error_message && (
                            <p className="text-xs text-red-600 mt-1">
                              {deployment.error_message}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={getStatusBadgeVariant(deployment.status) as 'success' | 'error' | 'warning' | 'info'}
                        >
                          {deployment.status.replace('_', ' ')}
                        </Badge>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Page {pagination.page} of {pagination.pages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={page === pagination.pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
