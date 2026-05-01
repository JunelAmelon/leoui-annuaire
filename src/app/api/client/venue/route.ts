import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded?.uid;
    if (!uid) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { vendorId } = await req.json();
    if (!vendorId) return NextResponse.json({ ok: false, error: 'vendorId required' }, { status: 400 });

    const clientSnap = await adminDb.collection('clients').where('uid', '==', uid).limit(1).get();
    const clientDoc = clientSnap.docs[0];
    if (!clientDoc) return NextResponse.json({ ok: false, error: 'Client not found' }, { status: 404 });

    const clientId = clientDoc.id;

    const vendorSnap = await adminDb.collection('vendors').doc(String(vendorId)).get();
    if (!vendorSnap.exists) return NextResponse.json({ ok: false, error: 'Vendor not found' }, { status: 404 });

    const vendor = vendorSnap.data() || {};
    const category = String((vendor as any).category || '');
    if (category !== 'Lieux de réception') {
      return NextResponse.json({ ok: false, error: 'Vendor is not a reception venue' }, { status: 400 });
    }

    const venueName = String((vendor as any).name || '');
    const venueAddress = String((vendor as any).address || (vendor as any).location || '');

    const eventsSnap = await adminDb.collection('events').where('client_id', '==', clientId).limit(1).get();
    const eventDoc = eventsSnap.docs[0];

    const payload: Record<string, any> = {
      venue_vendor_id: vendorSnap.id,
      venue: venueName,
      venue_address: venueAddress || null,
      venue_set_at: new Date().toISOString(),
    };

    await adminDb.collection('clients').doc(clientId).set(payload, { merge: true });
    if (eventDoc) {
      await adminDb.collection('events').doc(eventDoc.id).set(payload, { merge: true });
    }

    return NextResponse.json({ ok: true, venue: { vendor_id: vendorSnap.id, name: venueName, address: venueAddress } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
