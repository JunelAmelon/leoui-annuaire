'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

type Props = {
  children: React.ReactNode;
  requiredArea: 'client' | 'prestataire';
};

export default function AuthRouteGuard({ children, requiredArea }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user?.uid) {
      router.replace(`/login?next=${encodeURIComponent(pathname || '/')}`);
      return;
    }
    const role = user.role || 'client';
    if (requiredArea === 'client' && (role === 'planner' || role === 'vendor' || role === 'admin')) {
      router.replace(role === 'admin' ? '/admin' : '/espace-prestataire');
      return;
    }
    if (requiredArea === 'prestataire' && role === 'client') {
      router.replace('/espace-client');
    }
  }, [loading, user?.uid, user?.role, requiredArea, pathname, router]);

  if (loading || !user?.uid) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-rose-200 border-t-rose-600 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
