import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const vendor_id = String(body?.vendor_id || '');
    const client_name = String(body?.client_name || '');
    const client_email = String(body?.client_email || '');
    const client_phone = String(body?.client_phone || '');
    const message = String(body?.message || '');

    if (!vendor_id || !client_name || !client_email || !message) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const ref = await adminDb.collection('conversations').add({
      vendor_id,
      client_name,
      client_email,
      client_phone,
      message,
      created_at: now,
      status: 'new',
      type: 'vendor',
      last_message: message,
      last_message_at: now,
    });

    return NextResponse.json({ ok: true, id: ref.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
