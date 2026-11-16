/**
 * Règles pures de la chronologie : heures locales, tri (y compris après minuit),
 * détection des trajets trop serrés, décalages, état « en direct ».
 * Aucune dépendance (ni Firebase, ni Date du fuseau du navigateur pour le stockage).
 *
 * Les horaires sont des heures LOCALES du lieu au format `YYYY-MM-DDTHH:mm:00` :
 * l'ordre lexicographique est l'ordre chronologique et rien ne bouge selon le fuseau du lecteur.
 */

import {
  CATEGORIES, DAY_KEYS, DAY_OFFSETS,
  type DayKey, type DayPlan, type TimelineItem,
} from './types';

/** Avant cette heure, un moment saisi sur une journée appartient à la nuit qui la prolonge (lendemain calendaire). */
export const NIGHT_CUTOFF_HOUR = 6;
/** Marge de confort ajoutée au temps de trajet avant de considérer l'enchaînement comme serein. */
export const TRAVEL_MARGIN_MIN = 10;

const pad = (n: number) => String(n).padStart(2, '0');

/** Décompose une heure locale en composantes, via UTC pour ne dépendre d'aucun fuseau. */
const toUtcMs = (local: string): number => {
  const [d, t = '00:00'] = local.split('T');
  const [y, m, day] = d.split('-').map(Number);
  const [h, min] = t.split(':').map(Number);
  return Date.UTC(y, (m || 1) - 1, day || 1, h || 0, min || 0);
};
const fromUtcMs = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`;
};

export const isValidDate = (date: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(toUtcMs(`${date}T00:00`));
export const isValidTime = (time: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

export const addDays = (date: string, days: number): string => fromUtcMs(toUtcMs(`${date}T00:00`) + days * 86_400_000).slice(0, 10);
export const addMinutes = (local: string, minutes: number): string => fromUtcMs(toUtcMs(local) + minutes * 60_000);
export const minutesBetween = (from: string, to: string): number => Math.round((toUtcMs(to) - toUtcMs(from)) / 60_000);

export const timeOf = (local: string): string => local.slice(11, 16);
export const dateOf = (local: string): string => local.slice(0, 10);

/** Date calendaire d'une journée du planning à partir de la date du mariage. */
export const dayDate = (weddingDate: string, key: DayKey): string => addDays(weddingDate, DAY_OFFSETS[key]);

/** Normalise une date d'événement quelconque (`2026-09-15`, ISO complet…) en `YYYY-MM-DD`, ou `null`. */
export function normalizeWeddingDate(raw: string | null | undefined): string | null {
  const head = String(raw ?? '').slice(0, 10);
  return isValidDate(head) ? head : null;
}

/**
 * Construit l'horodatage d'un moment saisi `HH:mm` sur une journée.
 * Une heure avant 06:00 est rangée après minuit : 01:30 le jour J = lendemain calendaire, en fin de soirée.
 */
export function buildStartAt(blockDate: string, time: string): string {
  const hour = Number(time.slice(0, 2));
  const date = hour < NIGHT_CUTOFF_HOUR ? addDays(blockDate, 1) : blockDate;
  return `${date}T${time}:00`;
}

/** Vrai si le moment tombe après minuit par rapport à la date de sa journée. */
export const isAfterMidnight = (item: TimelineItem, blockDate: string): boolean => dateOf(item.start_at) > blockDate;

export const endOf = (item: TimelineItem): string => item.end_at ?? addMinutes(item.start_at, item.duration_min);

/** Tri chronologique stable ; à heure égale, l'ordre de saisie (`sort_key`) départage. */
export function sortItems(items: TimelineItem[]): TimelineItem[] {
  return [...items].sort((a, b) => (a.start_at < b.start_at ? -1 : a.start_at > b.start_at ? 1 : a.sort_key - b.sort_key));
}

// ── Alertes d'enchaînement ───────────────────────────────────────────────────

export type AlertKind = 'overlap' | 'travel_impossible' | 'travel_tight' | 'travel_unknown';
export type AlertLevel = 'danger' | 'warning' | 'info';

export interface TimelineAlert {
  /** Moment concerné (celui qui arrive trop tôt). */
  item_id: string;
  prev_id: string;
  kind: AlertKind;
  level: AlertLevel;
  message: string;
  /** Minutes à gagner pour que l'enchaînement tienne (0 pour une simple information). */
  missing_min: number;
  /** Nouvelle heure de début proposée pour `item_id`. */
  suggested_start_at: string | null;
}

const samePlace = (a: TimelineItem, b: TimelineItem): boolean => {
  const na = a.location.name.trim().toLowerCase();
  const nb = b.location.name.trim().toLowerCase();
  return !na || !nb || na === nb;
};

const roundUp5 = (n: number) => Math.ceil(n / 5) * 5;

/**
 * Compare chaque moment au précédent (liste triée) :
 * - chevauchement : le suivant commence avant la fin du précédent ;
 * - changement de lieu : le battement doit couvrir le trajet (impossible) puis trajet + marge (serré) ;
 * - changement de lieu sans durée de trajet : simple rappel.
 */
export function detectAlerts(items: TimelineItem[]): TimelineAlert[] {
  const sorted = sortItems(items);
  const alerts: TimelineAlert[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const gap = minutesBetween(endOf(prev), cur.start_at);
    const moving = !samePlace(prev, cur);
    const travel = moving ? Math.max(0, cur.location.travel_min) : 0;
    const base = { item_id: cur.id, prev_id: prev.id };

    if (moving && travel === 0) {
      if (gap < 0) alerts.push(overlapAlert(base, prev, cur, gap));
      else alerts.push({ ...base, kind: 'travel_unknown', level: 'info', missing_min: 0, suggested_start_at: null,
        message: `Changement de lieu vers « ${cur.location.name} » : indiquez le temps de trajet pour vérifier l’enchaînement.` });
      continue;
    }
    if (moving && gap < travel) {
      const missing = roundUp5(travel + TRAVEL_MARGIN_MIN - gap);
      alerts.push({ ...base, kind: 'travel_impossible', level: 'danger', missing_min: missing,
        suggested_start_at: addMinutes(cur.start_at, missing),
        message: `${travel} min de trajet jusqu’à « ${cur.location.name} », mais ${gap <= 0 ? 'aucun battement' : `seulement ${gap} min`} après « ${prev.title} ».` });
      continue;
    }
    if (moving && gap < travel + TRAVEL_MARGIN_MIN) {
      const missing = roundUp5(travel + TRAVEL_MARGIN_MIN - gap);
      alerts.push({ ...base, kind: 'travel_tight', level: 'warning', missing_min: missing,
        suggested_start_at: addMinutes(cur.start_at, missing),
        message: `Trajet serré : ${travel} min de route pour ${gap} min de battement. Au moindre retard, « ${cur.title} » démarre en retard.` });
      continue;
    }
    if (gap < 0) alerts.push(overlapAlert(base, prev, cur, gap));
  }
  return alerts;
}

function overlapAlert(base: { item_id: string; prev_id: string }, prev: TimelineItem, cur: TimelineItem, gap: number): TimelineAlert {
  const missing = roundUp5(-gap);
  return { ...base, kind: 'overlap', level: 'warning', missing_min: missing, suggested_start_at: addMinutes(cur.start_at, missing),
    message: `« ${cur.title} » commence ${-gap} min avant la fin de « ${prev.title} ».` };
}

// ── Décalages ────────────────────────────────────────────────────────────────

const shifted = (item: TimelineItem, minutes: number): TimelineItem => ({
  ...item,
  start_at: addMinutes(item.start_at, minutes),
  end_at: item.end_at ? addMinutes(item.end_at, minutes) : null,
});

/**
 * Décale un moment de `minutes`. Avec `cascade`, tous les moments qui le suivent bougent d'autant :
 * c'est ce qui permet d'absorber un retard sans recréer d'autres conflits.
 */
export function shiftFrom(items: TimelineItem[], itemId: string, minutes: number, cascade: boolean): TimelineItem[] {
  const sorted = sortItems(items);
  const index = sorted.findIndex((i) => i.id === itemId);
  if (index === -1 || minutes === 0) return sorted;
  return sortItems(sorted.map((item, i) => (i === index || (cascade && i > index) ? shifted(item, minutes) : item)));
}

/** Déplace un moment à une nouvelle heure de début, en conservant sa durée. */
export function moveTo(items: TimelineItem[], itemId: string, startAt: string, cascade = false): TimelineItem[] {
  const item = items.find((i) => i.id === itemId);
  return item ? shiftFrom(items, itemId, minutesBetween(item.start_at, startAt), cascade) : sortItems(items);
}

/** Recale toutes les dates quand la date du mariage change (les heures restent identiques). */
export function rebasePlanDates(plan: DayPlan, weddingDate: string): DayPlan {
  const delta = minutesBetween(`${plan.days.day.date}T00:00`, `${weddingDate}T00:00`);
  if (delta === 0) return plan;
  const days = { ...plan.days };
  for (const key of DAY_KEYS) {
    days[key] = { date: dayDate(weddingDate, key), items: plan.days[key].items.map((i) => shifted(i, delta)) };
  }
  return { ...plan, days };
}

// ── Vue en direct ────────────────────────────────────────────────────────────

/** Heure locale « maintenant » au format du planning (heure de l'appareil, supposé sur place le jour J). */
export function localNow(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
}

export interface LiveState {
  phase: 'before' | 'running' | 'between' | 'done' | 'empty';
  current: TimelineItem[];
  next: TimelineItem | null;
  /** Minutes avant le prochain moment (≥ 0), ou `null`. */
  minutes_to_next: number | null;
  /** Avancement du moment en cours, de 0 à 1. */
  progress: number;
  done_count: number;
  total: number;
}

export function liveState(items: TimelineItem[], now: string): LiveState {
  const sorted = sortItems(items);
  const total = sorted.length;
  if (!total) return { phase: 'empty', current: [], next: null, minutes_to_next: null, progress: 0, done_count: 0, total };
  const current = sorted.filter((i) => i.start_at <= now && now < endOf(i));
  const next = sorted.find((i) => i.start_at > now) ?? null;
  const done_count = sorted.filter((i) => endOf(i) <= now).length;
  const main = current[current.length - 1];
  const span = main ? Math.max(1, minutesBetween(main.start_at, endOf(main))) : 1;
  const progress = main ? Math.min(1, Math.max(0, minutesBetween(main.start_at, now) / span)) : 0;
  const phase: LiveState['phase'] = current.length ? 'running' : !next ? 'done' : done_count === 0 ? 'before' : 'between';
  return { phase, current, next, minutes_to_next: next ? Math.max(0, minutesBetween(now, next.start_at)) : null, progress, done_count, total };
}

/** Tous les moments du planning, dans l'ordre, avec leur journée. */
export function allItems(plan: DayPlan): { key: DayKey; item: TimelineItem }[] {
  return DAY_KEYS.flatMap((key) => sortItems(plan.days[key].items).map((item) => ({ key, item })));
}

// ── Formats ──────────────────────────────────────────────────────────────────

export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  return m % 60 === 0 ? `${m / 60} h` : `${Math.floor(m / 60)} h ${pad(m % 60)}`;
}

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « samedi 15 septembre 2026 » — sans passer par le fuseau du navigateur. */
export function formatLongDate(date: string): string {
  const d = new Date(toUtcMs(`${date}T00:00`));
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// ── Ponts de données ─────────────────────────────────────────────────────────

/** Programme public pour la Gazette : moments du jour J visibles des invités. */
export interface GazetteProgramItem { time: string; title: string; description?: string; location?: string }

export function toGazetteProgram(plan: DayPlan): GazetteProgramItem[] {
  return sortItems(plan.days.day.items)
    .filter((i) => CATEGORIES[i.category].guest_facing)
    .map((i) => ({
      time: timeOf(i.start_at),
      title: i.title,
      ...(i.location.name ? { location: i.location.name } : {}),
    }));
}

/** Repères proposés à la Playlist : `id` stable à stocker dans `playlists.sections[].linked_moment_id`. */
export interface PlaylistMoment { id: string; label: string; start_at: string; day: DayKey; category: TimelineItem['category'] }

export function toPlaylistMoments(plan: DayPlan): PlaylistMoment[] {
  return allItems(plan)
    .filter(({ item }) => CATEGORIES[item.category].musical)
    .map(({ key, item }) => ({ id: item.id, label: item.title, start_at: item.start_at, day: key, category: item.category }));
}
