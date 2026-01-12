'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Server, Plus, Rocket } from 'lucide-react';
import { Button } from '@/components/ui';

export function AppHeader() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/mcp', label: 'MCP Servers', icon: Server },
    { href: '/deployments', label: 'Deployments', icon: Rocket },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(href);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="w-full px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold text-gray-900 hover:opacity-80 no-underline">
              MCP Control Plane
            </Link>
            <nav className="flex items-center gap-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href} className="no-underline">
                    <Button
                      variant={active ? 'primary' : 'secondary'}
                      size="sm"
                    >
                      <Icon className="w-4 h-4 mr-1.5" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/mcp/new" className="no-underline">
              <Button variant="primary" size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                Create MCP
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}



