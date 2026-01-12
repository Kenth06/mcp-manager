'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

interface Deployment {
  id: string;
  mcp_id: string;
  version_id: string;
  operation_type: 'publish' | 'rollback';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  worker_name?: string;
  started_at: number;
  completed_at?: number;
  error_message?: string;
  mcp_name?: string;
  version?: string;
}

interface DeploymentsResponse {
  data: Deployment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface UseDeploymentsOptions {
  mcpId?: string;
  page?: number;
  limit?: number;
}

export function useDeployments(options: UseDeploymentsOptions = {}) {
  const { mcpId, page = 1, limit = 20 } = options;
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [pagination, setPagination] = useState<DeploymentsResponse['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDeployments = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/api/deployments?page=${page}&limit=${limit}`;
      if (mcpId) {
        url += `&mcpId=${mcpId}`;
      }
      const response = await api.get<DeploymentsResponse>(url);
      setDeployments(response.data || []);
      setPagination(response.pagination);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch deployments'));
    } finally {
      setLoading(false);
    }
  }, [mcpId, page, limit]);

  useEffect(() => {
    fetchDeployments();
  }, [fetchDeployments]);

  return { deployments, pagination, loading, error, refetch: fetchDeployments };
}
