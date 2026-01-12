'use client';

import { useParams, useRouter } from 'next/navigation';
import { DeploymentTimeline } from '@/components/deployment/DeploymentTimeline';
import { useDeploymentStream } from '@/lib/hooks/useDeploymentStream';
import { Card, DetailsList, Badge, DateDisplay, Button, Alert } from '@/components/ui';
import { PageHeader } from '@/components/common';
import Link from 'next/link';
import { CheckCircle2, XCircle, Clock, ArrowRight } from 'lucide-react';

export default function DeploymentPage() {
  const params = useParams();
  const router = useRouter();
  const deploymentId = params.id as string;
  const { state, isConnected, progressEvents } = useDeploymentStream({
    deploymentId,
    enabled: true,
  });

  const statusText = state?.status === 'completed' ? 'Completed' :
    state?.status === 'failed' ? 'Failed' :
    state?.status === 'in_progress' ? 'In Progress' : 'Pending';

  const statusBadgeVariant = state?.status === 'completed' ? 'success' :
    state?.status === 'failed' ? 'error' :
    state?.status === 'in_progress' ? 'warning' : 'info';

  const StatusIcon = state?.status === 'completed' ? CheckCircle2 :
    state?.status === 'failed' ? XCircle : Clock;

  const isComplete = state?.status === 'completed' || state?.status === 'failed';

  // Calculate duration
  const duration = state?.startedAt && state?.completedAt
    ? Math.round((state.completedAt - state.startedAt) / 1000)
    : null;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30 relative">
      <div className="relative z-10 w-full px-6 py-8">
        <Link href="/mcp" className="text-[#056DFF] hover:opacity-80 mb-6 inline-block no-underline text-sm">
          ← Back to MCPs
        </Link>

        <PageHeader
          title="Deployment Progress"
          description={`Tracking deployment ${deploymentId.substring(0, 8)}...`}
        />

        {state?.status === 'completed' && (
          <Alert variant="success" title="Deployment Successful" className="mb-6">
            Your MCP has been successfully deployed to Cloudflare Workers.
            {duration && ` Completed in ${formatDuration(duration)}.`}
          </Alert>
        )}

        {state?.status === 'failed' && (
          <Alert variant="error" title="Deployment Failed" className="mb-6">
            {state.error || 'An error occurred during deployment.'}
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DeploymentTimeline deploymentId={deploymentId} />
          </div>

          <div className="space-y-6">
            <Card className="ring ring-gray-950/10 shadow-xs border border-gray-200">
              <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                <h2 className="text-sm font-semibold text-gray-900">
                  Deployment Status
                </h2>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-full ${
                    state?.status === 'completed' ? 'bg-green-100' :
                    state?.status === 'failed' ? 'bg-red-100' :
                    'bg-blue-100'
                  }`}>
                    <StatusIcon className={`w-6 h-6 ${
                      state?.status === 'completed' ? 'text-green-600' :
                      state?.status === 'failed' ? 'text-red-600' :
                      'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{statusText}</p>
                    <p className="text-xs text-gray-500">
                      {isConnected ? 'Live updates enabled' : 'Reconnecting...'}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <DetailsList
                    items={[
                      {
                        label: 'Deployment ID',
                        value: (
                          <span className="font-mono text-xs">
                            {deploymentId.substring(0, 8)}...
                          </span>
                        ),
                      },
                      {
                        label: 'Status',
                        value: <Badge variant={statusBadgeVariant}>{statusText}</Badge>,
                      },
                      {
                        label: 'Connection',
                        value: (
                          <Badge variant={isConnected ? 'success' : 'warning'}>
                            {isConnected ? 'Connected' : 'Reconnecting'}
                          </Badge>
                        ),
                      },
                      {
                        label: 'Steps Completed',
                        value: `${progressEvents.filter((_, i) => i < progressEvents.length - 1 || isComplete).length}/${progressEvents.length || 0}`,
                      },
                      ...(state?.startedAt ? [{
                        label: 'Started',
                        value: <DateDisplay date={state.startedAt} />,
                      }] : []),
                      ...(state?.completedAt ? [{
                        label: 'Completed',
                        value: <DateDisplay date={state.completedAt} />,
                      }] : []),
                      ...(duration ? [{
                        label: 'Duration',
                        value: formatDuration(duration),
                      }] : []),
                    ]}
                  />
                </div>
              </div>
            </Card>

            {isComplete && (
              <Card className="ring ring-gray-950/10 shadow-xs border border-gray-200">
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Next Steps</h3>
                  <div className="space-y-2">
                    <Button
                      variant="primary"
                      className="w-full justify-between"
                      onClick={() => router.push('/mcp')}
                    >
                      View All MCPs
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full justify-between"
                      onClick={() => router.push('/deployments')}
                    >
                      View Deployment History
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



