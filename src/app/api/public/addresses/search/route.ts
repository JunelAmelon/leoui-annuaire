import { NextRequest, NextResponse } from 'next/server';

/**
 * Autocomplétion d'adresses françaises (Base Adresse Nationale).
 * Proxy de api-adresse.data.gouv.fr — renvoie rue + ville + code postal
 * pour pouvoir pré-remplir les champs du formulaire.
 */
export type AddressSuggestion = {
  label: string;      // "12 Rue des Lilas 69001 Lyon"
  street: string;     // "12 Rue des Lilas"
  city: string;       // "Lyon"
  postcode: string;   // "69001"
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '8', 10), 1), 15);

  if (q.length < 3) {
    return NextResponse.json({ ok: true, suggestions: [] });
  }

  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&autocomplete=1&limit=${limit}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error('BAN unavailable');

    const json = await res.json();
    const features = Array.isArray(json?.features) ? json.features : [];

    const suggestions: AddressSuggestion[] = features
      .map((f: any) => {
        const p = f?.properties || {};
        const housenumber = p.housenumber ? `${p.housenumber} ` : '';
        const street = p.street || '';
        if (!street) return null;
        return {
          label: p.label || '',
          street: `${housenumber}${street}`,
          city: p.city || '',
          postcode: p.postcode || '',
        };
      })
      .filter((s: AddressSuggestion | null): s is AddressSuggestion => s !== null);

    return NextResponse.json({ ok: true, suggestions });
  } catch (e) {
    console.error('Address search failed:', e);
    return NextResponse.json({ ok: false, suggestions: [], error: "Impossible de charger les adresses" }, { status: 502 });
  }
}
