export type GazetteSectionType = 'story' | 'anecdote' | 'quiz' | 'program' | 'custom';

export type GazetteTheme = 'vintage_gazette' | 'chic_minimal' | 'romantic_rose';

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
}

export const GAZETTE_THEMES: Record<GazetteTheme, { label: string; description: string; previewBg: string; fontClass: string }> = {
  vintage_gazette: {
    label: 'Gazette Vintage',
    description: 'Style presse papier authentique, typographie à empattement, lettrines et bordures ouvragées.',
    previewBg: 'bg-[#faf6ee] text-[#1c1917] border-[#e7e0d3]',
    fontClass: 'font-serif',
  },
  chic_minimal: {
    label: 'Chic Minimaliste',
    description: 'Lignes épurées, typographie contemporaine, contrastes doux et mise en page éditoriale.',
    previewBg: 'bg-white text-slate-900 border-slate-200',
    fontClass: 'font-sans',
  },
  romantic_rose: {
    label: 'Romance Florale',
    description: 'Touches poudrées, reflets rose & champagne, parfait pour un mariage poétique et chaleureux.',
    previewBg: 'bg-rose-50/40 text-slate-800 border-rose-100',
    fontClass: 'font-serif',
  },
};
