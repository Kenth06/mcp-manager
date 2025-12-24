'use client';

import { useDeploymentStream, type DeploymentProgress } from '@/lib/hooks/useDeploymentStream';
import { Card, Badge, Loader, DateDisplay } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Rocket, Package, Upload, RefreshCw } from 'lucide-react';

interface Props {
  deploymentId: string;
}

const STEP_CONFIG: Record<string, { label: string; icon: any }> = {
  initializing: { label: 'Initialize', icon: Rocket },
  fetching_bundle: { label: 'Fetching Bundle', icon: Package },
  preparing_worker: { label: 'Preparing Worker', icon: RefreshCw },
  deploying: { label: 'Deploying to Cloudflare', icon: Upload },
  updating_routing: { label: 'Updating Routing', icon: RefreshCw },
  completed: { label: 'Completed', icon: CheckCircle2 },
  failed: { label: 'Failed', icon: XCircle },
  in_progress: { label: 'In Progress', icon: RefreshCw },
};

export function DeploymentTimeline({ deploymentId }: Props) {
  const { state, isConnected, error, progressEvents } = useDeploymentStream({
    deploymentId,
    enabled: true,
  });

  const isFailed = state?.status === 'failed';
  const isCompleted = state?.status === 'completed';
  
  // Reverse events for display (most recent first)
  const reversedProgressEvents = [...progressEvents].reverse();
  const currentProgressIndex = progressEvents.length - 1;

  return (
    <Card className="p-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900">
          Deployment Timeline
        </h2>
        <Badge variant={isConnected ? 'success' : 'error'}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Badge>
      </div>
      
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {progressEvents.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg"
            >
              <Loader size="md" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">Initializing deployment...</p>
                <p className="text-xs text-gray-600 mt-1">Waiting for deployment to start</p>
              </div>
            </motion.div>
          ) : (
            reversedProgressEvents.map((progress: DeploymentProgress, reversedIndex: number) => {
              const index = progressEvents.length - 1 - reversedIndex;
              const isCurrent = index === currentProgressIndex;
              const isComplete = index < currentProgressIndex || isCompleted;
              const stepConfig = STEP_CONFIG[progress.step] || STEP_CONFIG.in_progress;
              const StepIcon = stepConfig.icon;

              const bgClasses = isFailed && isCurrent
                ? 'bg-red-50 border-2 border-red-300'
                : isComplete
                  ? 'bg-green-50 border-2 border-green-300'
                  : 'bg-blue-50 border-2 border-blue-300';

              const icon = isFailed && isCurrent ? (
                <XCircle className="w-5 h-5 text-red-500" />
              ) : isComplete ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <Loader size="sm" className="text-blue-500" />
              );

              return (
                <motion.div
                  key={`${progress.step}-${progress.timestamp}`}
                  layout
                  initial={{ opacity: 0, y: -20, scale: 0.9 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1
                  }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                    mass: 1
                  }}
                  className={`flex items-start gap-4 p-4 rounded-lg ${bgClasses}`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 200,
                        delay: 0.1
                      }}
                      className="mt-0.5"
                    >
                      {icon}
                    </motion.div>
                    {isCurrent && !isFailed && (
                      <motion.div
                        animate={{
                          scale: [1, 1.2, 1]
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.5
                        }}
                      >
                        <StepIcon className="w-4 h-4 text-blue-600" />
                      </motion.div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-sm font-semibold text-gray-900"
                      >
                        {stepConfig.label}
                      </motion.span>
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        <Badge
                          variant={
                            isFailed
                              ? "error"
                              : isComplete
                                ? "success"
                                : "warning"
                          }
                          className="text-xs"
                        >
                          {progress.progress}%
                        </Badge>
                      </motion.div>
                    </div>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.25 }}
                      className="text-xs text-gray-700 font-medium"
                    >
                      {progress.message}
                    </motion.p>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="mt-1.5 text-[11px] text-gray-500 flex items-center gap-1"
                    >
                      <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                      <DateDisplay date={progress.timestamp} />
                    </motion.div>
                    {progress.data && Object.keys(progress.data).length > 0 && (
                      <motion.details
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="mt-2"
                      >
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          View details
                        </summary>
                        <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto">
                          {JSON.stringify(progress.data, null, 2)}
                        </pre>
                      </motion.details>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4"
          >
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 font-medium">Connection Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </motion.div>
        )}

        {state?.error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4"
          >
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 font-medium">Deployment Failed</p>
              <p className="text-red-600 text-sm mt-1">{state.error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {state && state.logs.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6"
        >
          <h3 className="font-medium mb-2 text-sm">Logs</h3>
          <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-sm">
            <AnimatePresence>
              {state.logs.map((log, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`py-1 ${
                    log.level === 'info' ? 'text-gray-300' :
                    log.level === 'warn' ? 'text-yellow-400' :
                    'text-red-400'
                  }`}
                >
                  <span className="text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  {' '}
                  {log.message}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </Card>
  );
}

