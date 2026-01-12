import type { Metadata } from 'next';
import './globals.css';
import { AppHeader } from '@/components/AppHeader';
import { Providers } from '@/components/Providers';

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
        <Providers>
          <AppHeader />
          <main className="bg-white min-h-screen">{children}</main>
        </Providers>
      </body>
    </html>
  );
}

