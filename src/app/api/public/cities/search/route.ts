import { NextRequest, NextResponse } from 'next/server';

export type LocationSuggestion = {
  type: 'city' | 'department' | 'region';
  name: string;
  label: string;
  code: string;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 25);
  const requestedTypes = searchParams.get('types')?.trim().toLowerCase() || 'city';
  const includeCity = requestedTypes.includes('city');
  const includeDepartment = requestedTypes.includes('department');
  const includeRegion = requestedTypes.includes('region');
  const includeAll = requestedTypes.includes('all');

  if (q.length < 1) {
    return NextResponse.json({ ok: true, cities: [], suggestions: [] });
  }

  const base = 'https://geo.api.gouv.fr';
  const calls: { url: string; type: LocationSuggestion['type'] }[] = [];
  if (includeAll || includeCity) {
    calls.push({
      url: `${base}/communes?nom=${encodeURIComponent(q)}&fields=nom,codesPostaux,population&limit=${limit}&boost=population`,
      type: 'city',
    });
  }
  if (includeAll || includeDepartment) {
    calls.push({
      url: `${base}/departements?nom=${encodeURIComponent(q)}&limit=10`,
      type: 'department',
    });
  }
  if (includeAll || includeRegion) {
    calls.push({
      url: `${base}/regions?nom=${encodeURIComponent(q)}&limit=10`,
      type: 'region',
    });
  }

  try {
    const results = await Promise.all(
      calls.map(({ url, type }) =>
        fetch(url, { next: { revalidate: 86400 } })
          .then(async (res) => ({ type, data: res.ok ? await res.json() : [] }))
          .catch(() => ({ type, data: [] }))
      )
    );

    const suggestions: LocationSuggestion[] = [];

    for (const { type, data } of results) {
      if (!Array.isArray(data)) continue;
      for (const item of data) {
        const code = String(item.code || '');
        if (type === 'city') {
          const nom = item.nom as string;
          const postal = Array.isArray(item.codesPostaux) && item.codesPostaux.length > 0
            ? ` (${item.codesPostaux[0]})`
            : '';
          suggestions.push({ type: 'city', name: nom, label: `${nom}${postal}`, code });
        } else if (type === 'department') {
          const nom = item.nom as string;
          suggestions.push({ type: 'department', name: nom, label: `${nom} (département)`, code });
        } else if (type === 'region') {
          const nom = item.nom as string;
          suggestions.push({ type: 'region', name: nom, label: `${nom} (région)`, code });
        }
      }
    }

    suggestions.sort((a, b) => {
      const order = { region: 0, department: 1, city: 2 } as const;
      return (order[a.type] || 0) - (order[b.type] || 0);
    });

    const cities = suggestions
      .filter((s) => s.type === 'city')
      .map((s) => s.label);

    return NextResponse.json({ ok: true, cities, suggestions });
  } catch (e) {
    console.error('Failed to fetch French cities:', e);
    return NextResponse.json({ ok: false, cities: [], suggestions: [], error: 'Impossible de charger les villes' }, { status: 502 });
  }
}
