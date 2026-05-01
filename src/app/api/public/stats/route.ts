import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const [vendorsSnap, citiesSnap, clientsSnap] = await Promise.all([
      adminDb.collection('vendors').limit(2000).get(),
      adminDb.collection('cities').where('active', '==', true).get(),
      adminDb.collection('clients').limit(2000).get(),
    ]);

    const vendorsCount = vendorsSnap.docs
      .map(d => d.data())
      .filter((v: any) => v?.name && v?.status !== 'inactive').length;

    const citiesCount = citiesSnap.size;
    const weddingsCount = clientsSnap.size;

    return NextResponse.json({ ok: true, vendorsCount, citiesCount, weddingsCount });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e), vendorsCount: 0, citiesCount: 0, weddingsCount: 0 },
      { status: 500 },
    );
  }
}
