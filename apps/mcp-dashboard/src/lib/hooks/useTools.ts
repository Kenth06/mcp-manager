'use client';

import { useState, useEffect } from 'react';
import { api } from '../api';

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  handler: string;
}

interface ToolsResponse {
  tools: Tool[];
  version?: string;
  isActive?: boolean;
}

export function useTools(mcpId: string) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [version, setVersion] = useState<string | null>(null);

  const fetchTools = async () => {
    try {
      setLoading(true);
      const response = await api.get<ToolsResponse>(`/api/tools/${mcpId}`);
      setTools(response.tools || []);
      setVersion(response.version || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch tools'));
    } finally {
      setLoading(false);
    }
  };

  const updateTools = async (updatedTools: Tool[]) => {
    try {
      setLoading(true);
      await api.patch(`/api/tools/${mcpId}`, { tools: updatedTools });
      setTools(updatedTools);
      setError(null);
      // Refresh to get new version
      await fetchTools();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update tools'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mcpId) {
      fetchTools();
    }
  }, [mcpId]);

  return { tools, loading, error, version, updateTools, refetch: fetchTools };
}

