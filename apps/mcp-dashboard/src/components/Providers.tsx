'use client';

import React from 'react';
import { ToastContainer } from '@/components/ui';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
}
