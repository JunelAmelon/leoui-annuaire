// Helper d'authentification des API routes — mutualise le pattern
// Bearer <Firebase idToken> répété dans les routes existantes.
// Server-only (firebase-admin).

import { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from './firebase-admin';
import { MarketError, UnauthorizedError } from './market/errors';
import { NextResponse } from 'next/server';

export async function requireAuth(req: Request): Promise<DecodedIdToken> {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) throw new UnauthorizedError('Token manquant');
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded?.uid) throw new Error('no uid');
    return decoded;
  } catch {
    throw new UnauthorizedError('Token invalide ou expiré');
  }
}

export function errorResponse(e: unknown): NextResponse {
  if (e instanceof MarketError) {
    return NextResponse.json(
      { ok: false, error: e.message, code: e.code, fields: (e as any).fields },
      { status: e.status }
    );
  }
  const message = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ ok: false, error: message }, { status: 500 });
}
