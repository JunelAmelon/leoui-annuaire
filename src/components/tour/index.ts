// Exportations publiques - utiliser des imports directs pour éviter les cycles
// Exemple: import { TourProvider } from '@/components/tour/TourContext'

// Composants UI
export { default as TourOverlay } from './TourOverlay';
export { default as TourTooltip } from './TourTooltip';
export { default as InteractiveTour } from './InteractiveTour';

// Types
export type { GuideStep, PageGuide } from './guides.config';
export type { TourStep } from './guides.config';
