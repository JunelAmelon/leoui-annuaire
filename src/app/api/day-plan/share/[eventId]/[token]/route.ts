// Lien partagé du Planning du jour J (témoins, prestataires) — accès sans compte.
// Fine couche : validation du jeton + quota, puis délégation au service. Admin SDK uniquement.

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { errorResponse } from '@/lib/api-auth';
import { consumeRateLimit } from '@/lib/rate-limit';
import { TooManyRequestsError } from '@/lib/market/errors';
import {
  AdminDayPlanReader, AdminVendorRequestRepository, readCoupleNames,
} from '@/features/day-plan/repositories/admin-day-plan.repository';
import { DayPlanShareService } from '@/features/day-plan/services/day-plan-share.service';

export const dynamic = 'force-dynamic';

const service = new DayPlanShareService(new AdminDayPlanReader(), new AdminVendorRequestRepository());

type Params = { params: { eventId: string; token: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const [view, coupleNames] = await Promise.all([
      service.getPublicView(params.eventId, params.token),
      readCoupleNames(params.eventId),
    ]);
    return NextResponse.json({ ok: true, couple_names: coupleNames, ...view }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    // Quota par lien : 6 propositions par tranche de 10 minutes.
    const key = `dayplan_${params.eventId}_${params.token}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
    const allowed = await consumeRateLimit(adminDb, key, Date.now(), { limit: 6, windowMs: 10 * 60_000 });
    if (!allowed) throw new TooManyRequestsError();

    const body = await req.json().catch(() => ({}));
    const request = await service.proposeShift(params.eventId, params.token, {
      item_id: body?.item_id,
      time: body?.time,
      reason: body?.reason,
    });
    return NextResponse.json({ ok: true, request });
  } catch (e) {
    return errorResponse(e);
  }
}
