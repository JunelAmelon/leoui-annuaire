/**
 * Transforme `{ subtitle: 'x' }` en `{ 'page.subtitle': 'x' }` pour une mise à jour Firestore partielle.
 * Les valeurs `undefined` sont ignorées (Firestore les refuse) ; `null` est conservé (= effacer / défaut).
 */
export function dottedPaths(prefix: string, patch: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) out[`${prefix}.${k}`] = v;
  }
  return out;
}
