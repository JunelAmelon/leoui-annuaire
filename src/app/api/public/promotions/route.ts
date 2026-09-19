import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const now = new Date().toISOString();
    const [promoSnap, vendorSnap] = await Promise.all([
      adminDb.collection('promotions').where('status', '==', 'active').get(),
      adminDb.collection('vendors').get(),
    ]);

    const vendorsById = new Map<string, any>();
    const vendorsByUid = new Map<string, any>();

    vendorSnap.docs.forEach((d) => {
      const data = d.data() || {};
      const vendor = { ...data, id: d.id };
      vendorsById.set(d.id, vendor);
      if (data.uid) vendorsByUid.set(String(data.uid), vendor);
    });

    const resolveVendor = (vendorId: string) => {
      return vendorsById.get(vendorId) || vendorsByUid.get(vendorId) || null;
    };

    const promotions = promoSnap.docs
      .map((d) => ({ ...d.data(), id: d.id }))
      .filter((p: any) => !p.valid_to || p.valid_to >= now)
      .map((p: any) => {
        const vendor = resolveVendor(p.vendor_id || '');
        if (!vendor) return null;
        const v = vendor as any;
        return {
          id: p.id,
          title: p.title || '',
          description: p.description || '',
          discount_type: p.discount_type || 'percentage',
          discount_value: Number(p.discount_value || 0),
          code: p.code || '',
          valid_to: p.valid_to || '',
          valid_from: p.valid_from || '',
          created_at: p.created_at || '',
          min_amount: Number(p.min_amount || 0),
          vendor_id: p.vendor_id || '',
          vendor: {
            id: v.id,
            name: String(v.name || ''),
            category: String(v.category || ''),
            location: String(v.location || ''),
            imageUrl: (Array.isArray(v.images) && v.images[0]) || v.imageUrl || v.photo || '',
          },
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    return NextResponse.json({ ok: true, promotions });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e), promotions: [] }, { status: 500 });
  }
}
