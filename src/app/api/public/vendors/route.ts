import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const [vendorsSnap, citiesSnap] = await Promise.all([
      adminDb.collection('vendors').limit(500).get(),
      adminDb.collection('cities').where('active', '==', true).get(),
    ]);

    const vendors = vendorsSnap.docs
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
        hasPromo: Boolean(v.hasPromo),
        description: String(v.description || ''),
        responseTime: String(v.responseTime || '48h'),
        status: String(v.status || 'active'),
      }));

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
