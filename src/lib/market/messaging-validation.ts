// Validation et nettoyage des entrées de messagerie (SRP : aucune règle métier ici).

import { ValidationError } from './errors';
import { MAX_ATTACHMENTS, MESSAGE_MAX_LENGTH } from './messaging-rules';
import { ConversationReportReason, MessageAttachment } from './messaging-types';

// Caractères de contrôle, espaces de largeur nulle et surcharges bidirectionnelles
// (usurpation d'affichage). ZWJ/ZWNJ conservés pour ne pas casser les emojis composés.
const UNSAFE_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B\u2060\uFEFF\u202A-\u202E\u2066-\u2069]/g;

export function normalizeBody(raw: unknown): string {
  if (raw === undefined || raw === null) return '';
  if (typeof raw !== 'string') throw new ValidationError('Message invalide', { body: 'Texte attendu' });

  const cleaned = raw
    .replace(/\r\n?/g, '\n')
    .replace(UNSAFE_CHARS, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (cleaned.length > MESSAGE_MAX_LENGTH) {
    throw new ValidationError(`Message trop long (${MESSAGE_MAX_LENGTH} caractères maximum)`, {
      body: `${MESSAGE_MAX_LENGTH} caractères maximum`,
    });
  }
  return cleaned;
}

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const URL_RE = /(?:https?:\/\/|www\.)\S+/i;
const BARE_DOMAIN_RE =
  /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|fr|net|org|io|me|co|ly|gl|shop|site|xyz|app|link|info|biz|online|store|club|top|vip|ru|cn|tk|ml)\b/i;

/** Lien externe = URL explicite ou nom de domaine nu. Les adresses email sont exclues du test. */
export function containsExternalLink(body: string): boolean {
  const withoutEmails = body.replace(EMAIL_RE, ' ');
  return URL_RE.test(withoutEmails) || BARE_DOMAIN_RE.test(withoutEmails);
}

export function assertMessageAllowed(body: string): void {
  if (containsExternalLink(body)) {
    throw new ValidationError(
      'Les liens externes ne sont pas autorisés. Vous pouvez partager vos coordonnées, mais ne payez jamais en dehors de LeOui Market.',
      { body: 'Lien externe interdit' }
    );
  }
}

/**
 * N'accepte que des images hébergées sur NOTRE compte Cloudinary : empêche
 * d'injecter des URLs arbitraires (pixels espions, contenu malveillant).
 * Sans nom de compte configuré, tout est refusé (échec fermé).
 */
export function parseAttachments(raw: unknown, cloudName: string | undefined): MessageAttachment[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new ValidationError('Pièces jointes invalides', { attachments: 'Liste attendue' });
  if (raw.length > MAX_ATTACHMENTS) {
    throw new ValidationError(`${MAX_ATTACHMENTS} photos maximum par message`, { attachments: 'Trop de photos' });
  }

  return raw.map((item) => {
    const url = typeof item === 'string' ? item : (item as { url?: unknown })?.url;
    if (typeof url !== 'string' || url.length > 500 || !cloudName) {
      throw new ValidationError('Photo invalide', { attachments: 'URL refusée' });
    }
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new ValidationError('Photo invalide', { attachments: 'URL refusée' });
    }
    const ok =
      parsed.protocol === 'https:' &&
      parsed.hostname === 'res.cloudinary.com' &&
      parsed.pathname.startsWith(`/${cloudName}/image/upload/`);
    if (!ok) throw new ValidationError('Photo invalide', { attachments: 'Hébergement non autorisé' });
    return { url: parsed.toString() };
  });
}

/** Identifiant fourni par le client : sert d'ID de message (idempotence en cas de double envoi). */
export function parseClientId(raw: unknown): string {
  if (typeof raw !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(raw)) {
    throw new ValidationError('Identifiant de message invalide', { client_id: '8 à 64 caractères alphanumériques' });
  }
  return raw;
}

export function buildPreview(body: string, attachmentCount: number): string {
  const text = body.replace(/\s+/g, ' ').trim().slice(0, 120);
  if (text) return text;
  return attachmentCount > 1 ? `[${attachmentCount} photos]` : '[Photo]';
}

const REPORT_REASONS: ConversationReportReason[] = ['spam', 'arnaque', 'harcelement', 'contenu_inapproprie', 'autre'];

export function parseReportReason(raw: unknown): ConversationReportReason {
  if (typeof raw === 'string' && (REPORT_REASONS as string[]).includes(raw)) return raw as ConversationReportReason;
  throw new ValidationError('Motif invalide', { reason: 'Motif non reconnu' });
}

export function parseOptionalComment(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const text = raw.replace(UNSAFE_CHARS, '').trim().slice(0, 1000);
  return text || undefined;
}
