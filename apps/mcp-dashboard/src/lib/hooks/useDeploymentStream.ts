'use client';

import { useEffect, useState } from 'react';

interface DeploymentLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

interface DeploymentState {
  id?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  logs: DeploymentLog[];
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface DeploymentProgress {
  step: string;
  progress: number;
  message: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

interface UseDeploymentStreamOptions {
  deploymentId: string;
  enabled?: boolean;
}

export function useDeploymentStream({ deploymentId, enabled = true }: UseDeploymentStreamOptions) {
  const [state, setState] = useState<DeploymentState | null>(null);
  const [progressEvents, setProgressEvents] = useState<DeploymentProgress[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !deploymentId) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
    const streamUrl = `${apiUrl}/api/deployments/${deploymentId}/stream`;

    const eventSource = new EventSource(streamUrl);

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'state':
            setState(message.data);
            break;
          case 'log':
            setState(prev => {
              if (!prev) {
                return {
                  status: 'in_progress' as const,
                  logs: [message.data],
                };
              }
              return {
                ...prev,
                logs: [...prev.logs, message.data],
              };
            });
            break;
          case 'progress':
            setProgressEvents(prev => [...prev, message.data]);
            break;
          case 'status':
            setState(prev => {
              if (!prev) {
                return {
                  status: message.data.status || 'pending',
                  logs: [],
                  error: message.data.error,
                };
              }
              return {
                ...prev,
                status: message.data.status || prev.status,
                error: message.data.error,
              };
            });
            break;
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      setIsConnected(false);
      setError('Connection error');
      eventSource.close();
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [deploymentId, enabled]);

  return { state, isConnected, error, progressEvents };
}

