import { NextResponse } from 'next/server';
import { admin, adminDb } from '@/lib/firebase-admin';

export async function GET(_: Request, ctx: { params: { id: string } }) {
  try {
    const rawId = ctx?.params?.id;
    if (!rawId) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });

    let vendorSnap = await adminDb.collection('vendors').doc(rawId).get();

    if (!vendorSnap.exists) {
      const [byUid, byLegacyId] = await Promise.all([
        adminDb.collection('vendors').where('uid', '==', rawId).limit(1).get(),
        adminDb.collection('vendors').where('id', '==', rawId).limit(1).get(),
      ]);
      vendorSnap = (byUid.docs[0] || byLegacyId.docs[0]) as any;
    }

    if (!vendorSnap || !vendorSnap.exists) {
      return NextResponse.json({ ok: true, vendor: null, reviews: [], promotions: [], similarVendors: [] });
    }

    const vendorId = vendorSnap.id;
    const vendorData = vendorSnap.data() || {};

    const [reviewsSnap, promoSnap] = await Promise.all([
      adminDb.collection('reviews').where('vendor_id', '==', vendorId).get(),
      adminDb.collection('promotions')
        .where('vendor_id', '==', vendorId)
        .where('status', '==', 'active')
        .get(),
    ]);

    let similar: any[] = [];
    const cat = (vendorData as any)?.category;
    if (cat) {
      const simSnap = await adminDb.collection('vendors').where('category', '==', cat).limit(12).get();
      similar = simSnap.docs
        .filter((d) => d.id !== vendorId)
        .slice(0, 3)
        .map((d) => {
          const data = d.data() || {};
          return {
            ...data,
            id: d.id,
            imageUrl: (Array.isArray((data as any).images) && (data as any).images[0]) || (data as any).imageUrl || (data as any).photo || '',
          };
        });
    }

    await adminDb.collection('vendors').doc(vendorId).set(
      {
        viewCount: admin.firestore.FieldValue.increment(1),
        lastViewedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    const vendor = {
      ...vendorData,
      id: vendorId,
      imageUrl: (Array.isArray((vendorData as any).images) && (vendorData as any).images[0]) || (vendorData as any).imageUrl || (vendorData as any).photo || '',
    };

    const reviews = reviewsSnap.docs.map((d) => ({ ...d.data(), id: d.id }));
    const promotions = promoSnap.docs.map((d) => ({ ...d.data(), id: d.id }));

    return NextResponse.json({ ok: true, vendor, reviews, promotions, similarVendors: similar });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
