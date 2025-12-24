'use client';

import { useState, useEffect } from 'react';
import { api } from '../api';

interface Mcp {
  id: string;
  name: string;
  description?: string;
  auth_type: 'public' | 'api_key' | 'oauth';
  current_version?: string;
  version_count?: number;
  last_deployed?: number;
  worker_name?: string;
  endpoint_url?: string;
  created_at: number;
  updated_at: number;
}

interface McpListResponse {
  data: Mcp[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function useMcp(page: number = 1, limit: number = 20) {
  const [mcps, setMcps] = useState<Mcp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMcps = async () => {
    try {
      setLoading(true);
      const response = await api.get<McpListResponse>(`/api/mcp?page=${page}&limit=${limit}`);
      console.log('API Response:', response); // Debug log
      setMcps(response.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching MCPs:', err); // Debug log
      setError(err instanceof Error ? err : new Error('Failed to fetch MCPs'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMcps();
  }, [page, limit]);

  return { mcps, loading, error, refetch: fetchMcps };
}

export function useMcpById(id: string) {
  const [mcp, setMcp] = useState<Mcp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMcp = async () => {
      try {
        setLoading(true);
        const response = await api.get<Mcp>(`/api/mcp/${id}`);
        setMcp(response);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch MCP'));
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMcp();
    }
  }, [id]);

  return { mcp, loading, error };
}

