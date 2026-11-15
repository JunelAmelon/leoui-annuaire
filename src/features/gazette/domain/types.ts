export type GazetteSectionType = 'story' | 'anecdote' | 'quiz' | 'program' | 'custom';

export type GazetteTheme = 'chic_minimal' | 'romantic_rose' | 'vintage_gazette';

export interface QuizQuestion {
  question: string;
  options: string[];
  answer_index: number;
}

export interface QuizSectionContent {
  questions: QuizQuestion[];
}

export interface StoryTimelineItem {
  year_or_date: string;
  title: string;
  text: string;
}

export interface StorySectionContent {
  narrative: string;
  timeline?: StoryTimelineItem[];
}

export interface AnecdoteItem {
  title: string;
  content: string;
}

export interface AnecdoteSectionContent {
  items: AnecdoteItem[];
}

export interface ProgramItem {
  time: string;
  title: string;
  description?: string;
  location?: string;
}

export interface ProgramSectionContent {
  items: ProgramItem[];
}

export interface CustomSectionContent {
  subtitle?: string;
  body: string;
  signature?: string;
}

export type SectionContent =
  | StorySectionContent
  | AnecdoteSectionContent
  | QuizSectionContent
  | ProgramSectionContent
  | CustomSectionContent
  | Record<string, unknown>;

export interface GazetteSection {
  id: string;
  type: GazetteSectionType;
  title: string;
  content: SectionContent;
  order: number;
}

export interface GazetteLayout {
  theme: GazetteTheme;
  accent_color: string;
  font_family?: 'bodoni' | 'playfair' | 'cinzel' | 'sans';
}

export interface Gazette {
  event_id: string;
  owner_id: string;
  title: string;
  subtitle?: string;
  wedding_date?: string;
  location_name?: string;
  cover_path: string | null;
  cover_caption?: string;
  editorial?: string;
  weather_forecast?: string;
  sections: GazetteSection[];
  program_source: 'plan' | 'custom';
  program_synced_at: string | null;
  layout: GazetteLayout;
  version: number;
  updated_at: string;
  created_at?: string;
  // Personnalisation avancée & multi-photos
  price_tag?: string;
  edition_tag?: string;
  story_photo_path?: string | null;
  witnesses_photo_path?: string | null;
  qr_code_target?: 'guestbook' | 'photos' | 'honeymoon';
}

export interface CreateGazetteInput {
  event_id: string;
  owner_id: string;
  title?: string;
  subtitle?: string;
  wedding_date?: string;
  location_name?: string;
}

export interface UpdateGazetteInput {
  title?: string;
  subtitle?: string;
  wedding_date?: string;
  location_name?: string;
  cover_path?: string | null;
  cover_caption?: string;
  editorial?: string;
  weather_forecast?: string;
  layout?: Partial<GazetteLayout>;
  expected_version: number;
  price_tag?: string;
  edition_tag?: string;
  story_photo_path?: string | null;
  witnesses_photo_path?: string | null;
  qr_code_target?: 'guestbook' | 'photos' | 'honeymoon';
}

export const WEDDING_COLOR_PALETTES = [
  { id: 'rose', label: 'Rose & Pivoine', hex: '#be123c', light: '#fff1f2', border: '#fecdd3' },
  { id: 'terracotta', label: 'Terracotta Chic', hex: '#c2410c', light: '#fff7ed', border: '#ffedd5' },
  { id: 'sauge', label: 'Vert Sauge', hex: '#4d7c0f', light: '#f7fee7', border: '#ecfccb' },
  { id: 'bleu_nuit', label: 'Bleu Nuit', hex: '#1e3a8a', light: '#eff6ff', border: '#dbeafe' },
  { id: 'champagne', label: 'Or & Champagne', hex: '#b45309', light: '#fffbeb', border: '#fef3c7' },
  { id: 'bordeaux', label: 'Bordeaux', hex: '#881337', light: '#fff1f2', border: '#ffe4e6' },
  { id: 'noir', label: 'Noir Minimaliste', hex: '#18181b', light: '#f4f4f5', border: '#e4e4e7' },
];

export const GAZETTE_THEMES: Record<
  GazetteTheme,
  { label: string; tag: string; description: string; previewBg: string; fontClass: string }
> = {
  chic_minimal: {
    label: 'Vogue Éditorial',
    tag: 'Haute Couture & Tendance',
    description: 'Style magazine de mode contemporain, minimaliste noir & blanc, typographie élégante et mise en page aérée.',
    previewBg: 'bg-white text-zinc-900 border-zinc-300',
    fontClass: 'font-serif',
  },
  romantic_rose: {
    label: 'Romance Florale',
    tag: 'Doux & Poétique',
    description: 'Teintes champagne poudrées, reflets rose & terracotta doux, typographie chaleureuse et poétique.',
    previewBg: 'bg-[#fffaf8] text-stone-900 border-rose-200',
    fontClass: 'font-serif',
  },
  vintage_gazette: {
    label: 'Gazette Parisienne',
    tag: 'Authentique Grand Quotidien',
    description: 'Papier vergé ivoire, oreilles de presse traditionnelles, manchettes et lettrines de caractère.',
    previewBg: 'bg-[#fcf9f2] text-stone-950 border-stone-400',
    fontClass: 'font-serif',
  },
};
