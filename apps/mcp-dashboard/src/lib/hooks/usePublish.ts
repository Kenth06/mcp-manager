'use client';

import { useState, useCallback } from 'react';
import { api } from '../api';

interface PublishResponse {
  deploymentId: string;
  operationId: string;
  streamUrl: string;
}

interface UsePublishOptions {
  onSuccess?: (response: PublishResponse) => void;
  onError?: (error: Error) => void;
}

export function usePublish(options?: UsePublishOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);

  const publish = useCallback(async (mcpId: string, version: string) => {
    setLoading(true);
    setError(null);
    setDeploymentId(null);

    try {
      const response = await api.post<PublishResponse>(
        `/api/versions/${mcpId}/${version}/publish`,
        {}
      );

      setDeploymentId(response.deploymentId);
      options?.onSuccess?.(response);

      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to publish version');
      setError(error);
      options?.onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [options]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setDeploymentId(null);
  }, []);

  return { publish, loading, error, deploymentId, reset };
}
