'use client';

import { useState, useEffect } from 'react';
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
}

interface VersionsResponse {
  versions: Version[];
}

export function useVersions(mcpId: string) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchVersions = async () => {
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
    };

    fetchVersions();
  }, [mcpId]);

  return { versions, loading, error };
}


