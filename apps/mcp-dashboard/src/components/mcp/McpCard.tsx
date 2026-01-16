'use client';

import Link from 'next/link';
import { Card, Badge, DateDisplay } from '@/components/ui';

interface McpCardProps {
  id: string;
  name: string;
  description?: string;
  currentVersion?: string;
  versionCount?: number;
  lastDeployed?: number;
  authType: 'public' | 'api_key' | 'oauth';
}

export function McpCard({
  id,
  name,
  description,
  currentVersion,
  versionCount = 0,
  lastDeployed,
  authType,
}: McpCardProps) {
  const getAuthBadgeVariant = (type: string) => {
    switch (type) {
      case 'public':
        return 'success' as const;
      case 'api_key':
        return 'info' as const;
      case 'oauth':
        return 'warning' as const;
      default:
        return 'default' as const;
    }
  };

  return (
    <Link href={`/mcp/${id}`} className="no-underline">
      <Card className="hover:shadow-md transition-all cursor-pointer border border-gray-200 hover:border-[#056DFF] p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate mb-1">{name}</h3>
            {description && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{description}</p>
            )}
          </div>
          <Badge variant={getAuthBadgeVariant(authType)} className="ml-2 flex-shrink-0 text-xs">
            {authType}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Version</p>
            <p className="text-sm font-medium text-gray-900">
              {currentVersion || 'None'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Versions</p>
            <p className="text-sm font-medium text-gray-900">{versionCount}</p>
          </div>
          {lastDeployed && (
            <div className="col-span-2 mt-2">
              <p className="text-xs text-gray-500 mb-0.5">Last Deployed</p>
              <DateDisplay date={lastDeployed} />
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
