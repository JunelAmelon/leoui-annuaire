import { NextRequest, NextResponse } from 'next/server';
import { resolveTrackPreviewUrl } from '@/features/playlist/services/preview-resolver';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title')?.trim() ?? '';
  const artist = searchParams.get('artist')?.trim() ?? '';

  if (!title) {
    return NextResponse.json({ preview_url: null }, { status: 400 });
  }

  const previewUrl = await resolveTrackPreviewUrl(title, artist);
  return NextResponse.json(
    { preview_url: previewUrl },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
