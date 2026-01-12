'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

interface Version {
  id: string;
  mcp_id: string;
  version: string;
  bundle_key: string;
  changelog?: string;
  is_active: boolean;
  deployed_at?: number;
  created_at: number;
  last_deploy_status?: string;
  last_deploy_time?: number;
}

interface VersionsResponse {
  versions: Version[];
}

export function useVersions(mcpId: string) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchVersions = useCallback(async () => {
    if (!mcpId) return;

    try {
      setLoading(true);
      const response = await api.get<VersionsResponse>(`/api/versions/${mcpId}`);
      setVersions(response.versions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch versions'));
    } finally {
      setLoading(false);
    }
  }, [mcpId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  return { versions, loading, error, refetch: fetchVersions };
}

interface RollbackOptions {
  onSuccess?: (version: string) => void;
  onError?: (error: Error) => void;
}

export function useRollback(options: RollbackOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const rollback = useCallback(async (mcpId: string, version: string) => {
    setLoading(true);
    setError(null);

    try {
      await api.post<{ success: boolean; message: string }>(`/api/versions/${mcpId}/${version}/rollback`, {});
      options.onSuccess?.(version);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Rollback failed');
      setError(error);
      options.onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [options]);

  return { rollback, loading, error };
}
