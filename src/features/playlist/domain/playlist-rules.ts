import type {
  DayPlanMomentRef,
  PlaylistSection,
  PlaylistStats,
  PlaylistTrack,
  TrackFlag,
} from './types';

export interface DefaultSectionDefinition {
  id: string;
  label: string;
  suggestedVibe: string;
}

export const DEFAULT_SECTION_DEFINITIONS: readonly DefaultSectionDefinition[] = [
  {
    id: 'cocktail',
    label: "Vin d'honneur & Cocktail",
    suggestedVibe: 'Jazz, Bossa Nova, Acoustique élégant',
  },
  {
    id: 'entree',
    label: 'Entrée des mariés en salle',
    suggestedVibe: 'Énergie festive, drop dynamique au refrain',
  },
  {
    id: 'diner',
    label: 'Dîner & Dégustation',
    suggestedVibe: 'Pop acoustique feutrée, soul douce',
  },
  {
    id: 'ouverture',
    label: 'Ouverture de bal',
    suggestedVibe: 'Valse lente, slow intime ou mashup surprenant',
  },
  {
    id: 'gateau',
    label: 'Pièce montée & Champagne',
    suggestedVibe: 'Climax orchestral, électro pop triomphale',
  },
  {
    id: 'soiree',
    label: 'Soirée dansante & Clubbing',
    suggestedVibe: 'Disco chic, Funk, House & Bangers festifs',
  },
] as const;

export const TRACK_FLAG_META: Record<
  TrackFlag,
  { label: string; badgeCls: string; description: string }
> = {
  must_play: {
    label: 'Incontournable',
    badgeCls: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'Titre clé à jouer impérativement au moment prévu.',
  },
  normal: {
    label: 'Ambiance',
    badgeCls: 'bg-stone-100 text-stone-700 border-stone-200',
    description: 'Titre d’ambiance laissé à l’appréciation du DJ.',
  },
  banned: {
    label: 'Blacklist',
    badgeCls: 'bg-stone-900 text-white border-stone-800',
    description: 'Titre interdit : ne pas jouer pendant la réception.',
  },
};

export function createDefaultSections(): PlaylistSection[] {
  return DEFAULT_SECTION_DEFINITIONS.map((def, index) => ({
    id: def.id,
    label: def.label,
    linked_moment_id: null,
    order: index + 1,
  }));
}

export function validateSectionLabel(label: string): string {
  const clean = label.trim();
  if (!clean) {
    throw new Error('Le nom du moment musical est obligatoire.');
  }
  if (clean.length > 80) {
    throw new Error('Le nom du moment ne peut pas dépasser 80 caractères.');
  }
  return clean;
}

export function validateTrackInput(
  title: string,
  artist: string,
  cueTime?: string | null,
  notes?: string | null
): {
  title: string;
  artist: string;
  cue_time: string | null;
  notes: string | null;
} {
  const cleanTitle = title.trim();
  const cleanArtist = artist.trim();
  const cleanCue = (cueTime ?? '').trim() || null;
  const cleanNotes = (notes ?? '').trim() || null;

  if (!cleanTitle) {
    throw new Error('Le titre du morceau est obligatoire.');
  }
  if (cleanTitle.length > 150) {
    throw new Error('Le titre ne peut pas dépasser 150 caractères.');
  }
  if (!cleanArtist) {
    throw new Error('L’artiste est obligatoire.');
  }
  if (cleanArtist.length > 120) {
    throw new Error('Le nom de l’artiste ne peut pas dépasser 120 caractères.');
  }
  if (cleanCue && cleanCue.length > 50) {
    throw new Error('Le repère de mixage ne peut pas dépasser 50 caractères.');
  }
  if (cleanNotes && cleanNotes.length > 500) {
    throw new Error('Les consignes DJ ne peuvent pas dépasser 500 caractères.');
  }

  return {
    title: cleanTitle,
    artist: cleanArtist,
    cue_time: cleanCue,
    notes: cleanNotes,
  };
}

export function computePlaylistStats(tracks: PlaylistTrack[]): PlaylistStats {
  const stats: PlaylistStats = {
    total: tracks.length,
    must_play: 0,
    banned: 0,
    normal: 0,
  };
  for (const track of tracks) {
    if (track.flag === 'must_play') stats.must_play += 1;
    else if (track.flag === 'banned') stats.banned += 1;
    else stats.normal += 1;
  }
  return stats;
}

export function sortTracks(tracks: PlaylistTrack[]): PlaylistTrack[] {
  return [...tracks].sort((a, b) => {
    // Les incontournables en premier, puis les normaux, puis la blacklist
    const flagPriority: Record<TrackFlag, number> = {
      must_play: 1,
      normal: 2,
      banned: 3,
    };
    if (flagPriority[a.flag] !== flagPriority[b.flag]) {
      return flagPriority[a.flag] - flagPriority[b.flag];
    }
    return a.order - b.order;
  });
}

export function formatMomentTime(isoDateTime?: string | null): string {
  if (!isoDateTime) return '';
  try {
    const parts = isoDateTime.split('T');
    if (parts.length > 1) {
      return parts[1].slice(0, 5).replace(':', 'h');
    }
    const d = new Date(isoDateTime);
    if (!Number.isNaN(d.getTime())) {
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${h}h${m}`;
    }
  } catch {
    // noop
  }
  return '';
}

export function matchMomentForSection(
  section: PlaylistSection,
  moments: DayPlanMomentRef[]
): DayPlanMomentRef | null {
  if (!section.linked_moment_id) return null;
  return moments.find((m) => m.id === section.linked_moment_id) ?? null;
}
