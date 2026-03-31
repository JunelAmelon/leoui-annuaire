import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(_: Request, ctx: { params: { id: string } }) {
  try {
    const id = String(ctx?.params?.id || '');
    if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });

    const doc = await adminDb.collection('articles').doc(id).get();
    if (!doc.exists) return NextResponse.json({ ok: true, article: null }, { status: 200 });

    const article = { ...doc.data(), id: doc.id };
    return NextResponse.json({ ok: true, article });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
