import { NextResponse } from 'next/server';
import { getPaypalCustomerManageUrl } from '@/lib/paypal';

export async function GET() {
  return NextResponse.json({ ok: true, url: getPaypalCustomerManageUrl() });
}
