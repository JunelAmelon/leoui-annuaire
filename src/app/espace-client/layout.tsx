import React from 'react';
import { ClientDataProvider } from '@/contexts/ClientDataContext';
import ClientDashboardLayout from './ClientDashboardLayout';
import AuthRouteGuard from '@/components/AuthRouteGuard';

export const dynamic = 'force-dynamic';

export default function EspaceClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthRouteGuard requiredArea="client">
      <ClientDataProvider>
        <ClientDashboardLayout>{children}</ClientDashboardLayout>
      </ClientDataProvider>
    </AuthRouteGuard>
  );
}
