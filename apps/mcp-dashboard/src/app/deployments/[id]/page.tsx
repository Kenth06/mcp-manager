'use client';

import { useParams } from 'next/navigation';
import { DeploymentTimeline } from '@/components/deployment/DeploymentTimeline';
import { useDeploymentStream } from '@/lib/hooks/useDeploymentStream';
import { Card, DetailsList, Badge, DateDisplay } from '@/components/ui';
import Link from 'next/link';

export default function DeploymentPage() {
  const params = useParams();
  const deploymentId = params.id as string;
  const { state, isConnected } = useDeploymentStream({
    deploymentId,
    enabled: true,
  });

  const statusText = state?.status === 'completed' ? 'Completed' :
    state?.status === 'failed' ? 'Failed' :
    state?.status === 'in_progress' ? 'In Progress' : 'Pending';

  const statusBadgeVariant = state?.status === 'completed' ? 'success' :
    state?.status === 'failed' ? 'error' :
    state?.status === 'in_progress' ? 'warning' : 'default';

  return (
    <main className="container mx-auto p-8">
      <Link href="/mcp" className="text-[#056DFF] hover:opacity-80 mb-4 inline-block">
        ← Back to MCPs
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Deployment Progress</h1>
        <p className="text-gray-600 mt-2">
          Deployment ID: <span className="font-mono text-sm">{deploymentId}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DeploymentTimeline deploymentId={deploymentId} />
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Deployment Details
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Metadata and links for this deployment.
              </p>
            </div>
            <DetailsList
              items={[
                {
                  label: 'Deployment ID',
                  value: (
                    <span className="font-mono">
                      {state?.id || deploymentId}
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
                    <Badge variant={isConnected ? 'success' : 'error'}>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  ),
                },
                ...(state?.startedAt ? [{
                  label: 'Started at',
                  value: <DateDisplay date={state.startedAt} />,
                }] : []),
                ...(state?.completedAt ? [{
                  label: 'Completed at',
                  value: <DateDisplay date={state.completedAt} />,
                }] : []),
              ]}
            />
          </Card>
        </div>
      </div>
    </main>
  );
}


