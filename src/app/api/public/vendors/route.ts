import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { computeVendorScore } from '@/lib/subscription-plans';

export async function GET() {
  try {
    const now = new Date().toISOString();
    const [vendorsSnap, citiesSnap, promosSnap] = await Promise.all([
      adminDb.collection('vendors').limit(500).get(),
      adminDb.collection('cities').where('active', '==', true).get(),
      adminDb.collection('promotions').where('status', '==', 'active').get(),
    ]);

    const activePromoVendorIds = new Set<string>();
    promosSnap.docs.forEach((d) => {
      const data = d.data() as any;
      if (data.vendor_id && (!data.valid_to || data.valid_to >= now)) {
        activePromoVendorIds.add(String(data.vendor_id));
      }
    });

    const rawVendors = vendorsSnap.docs
      .map((d) => ({ ...d.data(), id: d.id }))
      .filter((v: any) => v?.name && v?.status !== 'inactive')
      .map((v: any) => ({
        id: String(v.id),
        uid: String(v.uid || v.id),
        name: String(v.name || ''),
        category: String(v.category || 'Autres'),
        location: String(v.location || ''),
        rating: Number(v.rating || 0),
        reviewCount: Number(v.reviewCount || 0),
        images: Array.isArray(v.images) ? v.images : [],
        imageUrl: (Array.isArray(v.images) && v.images[0]) || v.imageUrl || v.photo || '',
        startingPrice: String(v.startingPrice || ''),
        featured: Boolean(v.featured),
        hasPromo: activePromoVendorIds.has(String(v.id)) || activePromoVendorIds.has(String(v.uid || v.id)),
        description: String(v.description || ''),
        responseTime: String(v.responseTime || '48h'),
        status: String(v.status || 'active'),
        subscriptionTier: String(v.subscriptionTier || 'free'),
        subscriptionStatus: String(v.subscriptionStatus || 'inactive'),
        weddingsCompleted: Number(v.weddingsCompleted || 0),
      }));

    const vendors = rawVendors
      .map((v: any) => ({ ...v, vendorScore: computeVendorScore(v) }))
      .sort((a: any, b: any) => b.vendorScore - a.vendorScore);

    const cities = citiesSnap.docs
      .map((d) => ({ ...d.data(), id: d.id }))
      .map((c: any) => String(c.name || ''))
      .filter(Boolean)
      .sort();

    return NextResponse.json({ ok: true, vendors, cities });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e), vendors: [], cities: [] }, { status: 500 });
  }
}
