/**
 * Système d'aide simplifié pour LeOui
 * 
 * Design moderne, non intrusif, mobile-first
 * 
 * @example
 * ```tsx
 * // Dans votre layout/page :
 * import { SimpleHelpProvider, SimpleHelpManager } from '@/components/help';
 * import { getPageHelps } from '@/components/help/helps.config';
 * 
 * const pageHelps = getPageHelps('dashboard', 'client');
 * 
 * return (
 *   <SimpleHelpProvider pageHelps={pageHelps}>
 *     <YourPage />
 *     <SimpleHelpManager />
 *   </SimpleHelpProvider>
 * );
 * ```
 * 
 * @example
 * ```tsx
 * // Sur un élément à aider :
 * <button data-help="planning">Mon Planning</button>
 * ```
 */

// Composants
export { SimpleHelpProvider, useSimpleHelp } from './SimpleHelpContext';
export { SimpleTooltip } from './SimpleTooltip';
export { HelpButton, HelpButtonInline } from './HelpButton';
export { SimpleHelpManager, SimpleHelpManagerInline } from './SimpleHelpManager';

// Configuration
export { getPageHelps, CLIENT_HELPS, VENDOR_HELPS, COMMON_HELPS } from './helps.config';

// Types
export type {
  TooltipPosition,
  SimpleHelp,
  PageHelps,
  HelpState,
  SimpleHelpProviderProps,
  HelpTooltipProps,
  HelpButtonProps,
} from './types';
