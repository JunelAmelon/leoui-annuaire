import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const snap = await adminDb
      .collection('articles')
      .where('status', '==', 'published')
      .get();

    const articles = snap.docs
      .map((d) => ({ ...d.data(), id: d.id }))
      .sort((a: any, b: any) => {
        const da = new Date(a.published_at || 0).getTime();
        const db = new Date(b.published_at || 0).getTime();
        return db - da;
      });

    return NextResponse.json({ ok: true, articles });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
