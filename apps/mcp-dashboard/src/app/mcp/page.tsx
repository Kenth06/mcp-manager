'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMcp } from '@/lib/hooks/useMcp';
import { McpCard } from '@/components/mcp/McpCard';
import { Loader, Alert } from '@/components/ui';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchBar } from '@/components/common/SearchBar';
import Link from 'next/link';

export default function McpListPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const { mcps, loading, error, refetch } = useMcp(1, 20);

  const filteredMcps = useMemo(() => {
    if (!searchQuery) return mcps;
    const query = searchQuery.toLowerCase();
    return mcps.filter(
      (mcp) =>
        mcp.name.toLowerCase().includes(query) ||
        mcp.description?.toLowerCase().includes(query)
    );
  }, [mcps, searchQuery]);

  if (error) {
    return (
      <div className="p-6">
        <Alert
          variant="error"
          title="Error loading MCPs"
          action={{
            label: 'Retry',
            onClick: refetch,
          }}
        >
          {error.message}
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30 relative">
      <div className="relative z-10 w-full px-6 py-8">
        <PageHeader
          title="MCP Servers"
          description="Manage your Model Context Protocol servers deployed on Cloudflare Workers"
          primaryAction={{
            label: 'Create New MCP',
            onClick: () => router.push('/mcp/new'),
          }}
        />

        <div className="border border-gray-200 rounded-md bg-white">
          <div className="p-6">
            <SearchBar
              placeholder="Search MCP servers..."
              value={searchQuery}
              onChange={setSearchQuery}
              onRefresh={refetch}
              loading={loading}
            />

            {loading && !mcps.length ? (
              <div className="flex items-center justify-center py-12">
                <Loader variant="overlay" text="Loading MCPs..." />
              </div>
            ) : filteredMcps.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">
                  {searchQuery ? 'No MCP servers found matching your search' : 'No MCP servers found'}
                </p>
                <Link href="/mcp/new">
                  <button className="px-4 py-2 bg-[#056DFF] text-white rounded-md hover:bg-[#0456CC] transition-colors">
                    Create your first MCP server
                  </button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMcps.map((mcp) => (
                  <McpCard
                    key={mcp.id}
                    id={mcp.id}
                    name={mcp.name}
                    description={mcp.description}
                    currentVersion={mcp.current_version}
                    versionCount={mcp.version_count}
                    lastDeployed={mcp.last_deployed}
                    authType={mcp.auth_type}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

