import type { Metadata } from 'next';
import './globals.css';
import { AppHeader } from '@/components/AppHeader';

export const metadata: Metadata = {
  title: 'MCP Control Plane',
  description: 'Sistema de gestión para MCP Servers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white min-h-screen">
        <AppHeader />
        <main className="bg-white min-h-screen">{children}</main>
      </body>
    </html>
  );
}

