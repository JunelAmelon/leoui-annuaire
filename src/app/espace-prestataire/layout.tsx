import AuthRouteGuard from '@/components/AuthRouteGuard';
import React from 'react';

export const dynamic = 'force-dynamic';

export default function EspacePrestatairLayout({ children }: { children: React.ReactNode }) {
  return <AuthRouteGuard requiredArea="prestataire">{children}</AuthRouteGuard>;
}
