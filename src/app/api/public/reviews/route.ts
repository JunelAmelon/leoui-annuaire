import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ ok: false, error: 'Use authenticated client-side review submission.' }, { status: 501 });
}
