'use client';

import React from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export function SearchBar({
  placeholder = 'Search',
  value,
  onChange,
  onRefresh,
  loading = false,
}: SearchBarProps) {
  return (
    <div className="flex gap-3 mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#056DFF] focus:border-transparent"
        />
      </div>
      {onRefresh && (
        <Button
          variant="secondary"
          onClick={onRefresh}
          className="bg-white hover:bg-gray-50"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      )}
    </div>
  );
}

