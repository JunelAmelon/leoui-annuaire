// Helpers partagés pour le domaine market.

export const MARKET_COMMISSION_RATE = 0.08;

/** Net reversé au vendeur : (articles + livraison) − commission sur les articles. */
export function sellerNetFromAmounts(a: { items: number; shipping: number }): number {
  return Math.round((a.items + a.shipping - a.items * MARKET_COMMISSION_RATE) * 100) / 100;
}

/** « Ris-Orangis (91130) » → { city: 'Ris-Orangis', postal: '91130' } */
export function splitCityLabel(raw: string): { city: string; postal?: string } {
  const m = raw.match(/^(.*?)\s*\((\d{5})\)\s*$/);
  return m ? { city: m[1].trim(), postal: m[2] } : { city: raw.trim() };
}

/** Affichage localisation sans doublon de code postal : « Ris-Orangis (91130) ». */
export function formatLocation(city: string, postal?: string): string {
  const parsed = splitCityLabel(city || '');
  const cp = postal || parsed.postal;
  return cp ? `${parsed.city} (${cp})` : parsed.city;
}

/**
 * Supprime récursivement les propriétés `undefined` d'un objet.
 * Firestore refuse strictement `undefined` comme valeur (contrairement à `null`),
 * et cette erreur se produit dès qu'un champ optionnel absent est sérialisé.
 * Appliqué au point d'écriture (store/service) pour couvrir tous les appelants.
 */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)) as T;
  }
  if (value !== null && typeof value === 'object') {
    // Ne pas toucher aux objets non-plain (Timestamp, FieldValue, Date…).
    if (value.constructor !== Object) return value;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}
