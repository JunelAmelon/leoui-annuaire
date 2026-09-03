import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 25);

  if (q.length < 1) {
    return NextResponse.json({ ok: true, cities: [] });
  }

  try {
    const geoUrl = `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(q)}&fields=nom,codesPostaux,population&limit=${limit}&boost=population`;
    const res = await fetch(geoUrl, { next: { revalidate: 0 } });

    if (!res.ok) {
      throw new Error(`geo.api.gouv.fr returned ${res.status}`);
    }

    const data = await res.json();
    const cities = (Array.isArray(data) ? data : [])
      .sort((a: any, b: any) => (b.population || 0) - (a.population || 0))
      .map((c: any) => {
        const nom = c.nom as string;
        const postal = Array.isArray(c.codesPostaux) && c.codesPostaux.length > 0
          ? ` (${c.codesPostaux[0]})`
          : '';
        return `${nom}${postal}`;
      });

    return NextResponse.json({ ok: true, cities });
  } catch (e) {
    console.error('Failed to fetch French cities:', e);
    return NextResponse.json({ ok: false, cities: [], error: 'Impossible de charger les villes' }, { status: 502 });
  }
}
