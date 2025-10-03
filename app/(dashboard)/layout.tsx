'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/components/auth/auth-provider';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}