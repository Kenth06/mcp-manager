'use client';

import React from 'react';
import { Card } from '@/components/ui';
import { Info } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  infoTooltip?: string;
}

export function StatCard({ title, value, infoTooltip }: StatCardProps) {
  return (
    <Card>
      <div className="text-xs text-gray-600 mb-1 line-clamp-1 truncate flex items-center gap-1">
        <span>{title}</span>
        {infoTooltip && (
          <button
            className="text-gray-600 hover:text-gray-800 transition-colors"
            aria-label={infoTooltip}
            title={infoTooltip}
          >
            <Info className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="w-full overflow-hidden h-8">
        <div className="transform scale-100 origin-left inline-block">
          <div className="text-lg md:text-2xl font-semibold whitespace-nowrap inline-block">
            {value}
          </div>
        </div>
      </div>
    </Card>
  );
}


