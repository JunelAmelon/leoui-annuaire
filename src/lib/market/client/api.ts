'use client';

import { auth } from '@/lib/firebase';

/** Appel d'une route /api/market/* avec le jeton Firebase. Lève une Error au message affichable. */
export async function marketApi<T = any>(url: string, init: RequestInit = {}): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) throw new Error(data?.error || 'Une erreur est survenue');
  return data as T;
}

export const newClientId = () => crypto.randomUUID().replace(/-/g, '');
