import React from 'react';
import { ClientDataProvider } from '@/contexts/ClientDataContext';
import ClientDashboardLayout from './ClientDashboardLayout';

export const dynamic = 'force-dynamic';

export default function EspaceClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientDataProvider>
      <ClientDashboardLayout>{children}</ClientDashboardLayout>
    </ClientDataProvider>
  );
}
