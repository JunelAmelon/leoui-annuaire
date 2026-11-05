// Formats d'affichage de la messagerie (fuseau local du navigateur).

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export function dayLabel(iso: string, nowMs: number): string {
  const d = new Date(iso);
  const now = new Date(nowMs);
  if (sameDay(d, now)) return 'Aujourd’hui';
  if (sameDay(d, new Date(nowMs - 86_400_000))) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Horodatage court pour la liste : heure si aujourd'hui, sinon jj/mm. */
export function shortStamp(iso: string, nowMs: number): string {
  const d = new Date(iso);
  return sameDay(d, new Date(nowMs))
    ? timeOf(iso)
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export function relativeSince(iso: string, nowMs: number): string {
  const min = Math.max(0, Math.floor((nowMs - Date.parse(iso)) / 60_000));
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const days = Math.floor(h / 24);
  return days === 1 ? 'hier' : `il y a ${days} jours`;
}
