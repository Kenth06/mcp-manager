'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

type ApiD1Binding = string | { name: string; databaseId?: string };
type ApiKvBinding = string | { name: string; namespaceId?: string };
type ApiR2Binding = string | { name: string; bucketName?: string };

// API bindings format (strings or objects with IDs)
export interface ApiBindings {
  d1?: ApiD1Binding[];
  kv?: ApiKvBinding[];
  r2?: ApiR2Binding[];
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
  const normalizeD1 = (items?: ApiBindings['d1']) => {
    if (!items) return undefined;
    return items
      .map((item) => {
        if (typeof item === 'string') {
          return { name: item, databaseId: '' };
        }
        if (item && typeof item === 'object' && 'name' in item) {
          const value = (item as Record<string, string>).databaseId;
          return { name: String(item.name), databaseId: value ? String(value) : '' };
        }
        return null;
      })
      .filter(Boolean) as Array<{ name: string; databaseId: string }>;
  };
  const normalizeKv = (items?: ApiBindings['kv']) => {
    if (!items) return undefined;
    return items
      .map((item) => {
        if (typeof item === 'string') {
          return { name: item, namespaceId: '' };
        }
        if (item && typeof item === 'object' && 'name' in item) {
          const value = (item as Record<string, string>).namespaceId;
          return { name: String(item.name), namespaceId: value ? String(value) : '' };
        }
        return null;
      })
      .filter(Boolean) as Array<{ name: string; namespaceId: string }>;
  };
  const normalizeR2 = (items?: ApiBindings['r2']) => {
    if (!items) return undefined;
    return items
      .map((item) => {
        if (typeof item === 'string') {
          return { name: item, bucketName: '' };
        }
        if (item && typeof item === 'object' && 'name' in item) {
          const value = (item as Record<string, string>).bucketName;
          return { name: String(item.name), bucketName: value ? String(value) : '' };
        }
        return null;
      })
      .filter(Boolean) as Array<{ name: string; bucketName: string }>;
  };
  return {
    d1: normalizeD1(apiBindings.d1),
    kv: normalizeKv(apiBindings.kv),
    r2: normalizeR2(apiBindings.r2),
    secrets: apiBindings.secrets,
  };
}

// Convert UI format to API format
export function uiBindingsToApi(uiBindings?: UiBindings): ApiBindings {
  if (!uiBindings) return {};
  const result: ApiBindings = {};

  if (uiBindings.d1?.length) {
    result.d1 = uiBindings.d1
      .map((b) => {
        const name = b.name?.trim();
        if (!name) return null;
        const databaseId = b.databaseId?.trim();
        return databaseId ? { name, databaseId } : { name };
      })
      .filter(Boolean) as Array<{ name: string; databaseId?: string }>;
  }
  if (uiBindings.kv?.length) {
    result.kv = uiBindings.kv
      .map((b) => {
        const name = b.name?.trim();
        if (!name) return null;
        const namespaceId = b.namespaceId?.trim();
        return namespaceId ? { name, namespaceId } : { name };
      })
      .filter(Boolean) as Array<{ name: string; namespaceId?: string }>;
  }
  if (uiBindings.r2?.length) {
    result.r2 = uiBindings.r2
      .map((b) => {
        const name = b.name?.trim();
        if (!name) return null;
        const bucketName = b.bucketName?.trim();
        return bucketName ? { name, bucketName } : { name };
      })
      .filter(Boolean) as Array<{ name: string; bucketName?: string }>;
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
  auth_config_type?: 'public' | 'api_key' | 'oauth';
  oauth_provider?: string | null;
  oauth_client_id?: string | null;
  oauth_introspection_url?: string | null;
  oauth_scopes?: string[] | null;
  has_api_key?: boolean;
  has_oauth_secret?: boolean;
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
