'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

// API bindings format (simple string arrays)
export interface ApiBindings {
  d1?: string[];
  kv?: string[];
  r2?: string[];
  secrets?: string[];
}

// UI bindings format (detailed with resource IDs)
export interface UiBindings {
  d1?: Array<{ name: string; databaseId: string }>;
  kv?: Array<{ name: string; namespaceId: string }>;
  r2?: Array<{ name: string; bucketName: string }>;
  secrets?: string[];
}

// Convert API format to UI format
export function apiBindingsToUi(apiBindings?: ApiBindings): UiBindings {
  if (!apiBindings) return {};
  return {
    d1: apiBindings.d1?.map(name => ({ name, databaseId: '' })),
    kv: apiBindings.kv?.map(name => ({ name, namespaceId: '' })),
    r2: apiBindings.r2?.map(name => ({ name, bucketName: '' })),
    secrets: apiBindings.secrets,
  };
}

// Convert UI format to API format
export function uiBindingsToApi(uiBindings?: UiBindings): ApiBindings {
  if (!uiBindings) return {};
  const result: ApiBindings = {};

  if (uiBindings.d1?.length) {
    result.d1 = uiBindings.d1.map(b => b.name).filter(Boolean);
  }
  if (uiBindings.kv?.length) {
    result.kv = uiBindings.kv.map(b => b.name).filter(Boolean);
  }
  if (uiBindings.r2?.length) {
    result.r2 = uiBindings.r2.map(b => b.name).filter(Boolean);
  }
  if (uiBindings.secrets?.length) {
    result.secrets = uiBindings.secrets.filter(Boolean);
  }

  return result;
}

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
  bindings?: ApiBindings;
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

  const fetchMcps = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<McpListResponse>(`/api/mcp?page=${page}&limit=${limit}`);
      setMcps(response.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch MCPs'));
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchMcps();
  }, [fetchMcps]);

  return { mcps, loading, error, refetch: fetchMcps };
}

export function useMcpById(id: string) {
  const [mcp, setMcp] = useState<Mcp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMcp = useCallback(async () => {
    if (!id) return;
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
  }, [id]);

  useEffect(() => {
    fetchMcp();
  }, [fetchMcp]);

  return { mcp, loading, error, refetch: fetchMcp };
}
