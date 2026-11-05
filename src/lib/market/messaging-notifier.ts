// Notifieur email des nouveaux messages. Le contenu utilisateur est échappé (HTML).
// Reçoit ses dépendances par injection : résolution de l'email et envoi.

import { MessageNotifier } from './messaging-ports';
import { renderEmailTemplate } from '@/lib/email-template';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function createEmailNotifier(deps: {
  getEmail: (userId: string) => Promise<string | null>;
  send: (m: { to: string; subject: string; html: string; text: string }) => Promise<boolean>;
  appUrl: string;
}): MessageNotifier {
  return {
    async notifyNewMessage({ recipientId, senderName, preview, conversationId, listingTitle }) {
      const to = await deps.getEmail(recipientId);
      if (!to) return;

      const about = listingTitle ? ` à propos de « ${esc(listingTitle)} »` : '';
      const link = `${deps.appUrl}/app/market/messages?c=${encodeURIComponent(conversationId)}`;
      const html = renderEmailTemplate({
        title: `Nouveau message de ${esc(senderName)}`,
        preheader: `${senderName} vous a écrit sur LeOui Market`,
        bodyHtml: `
          <p style="margin:0 0 12px;">Bonjour,</p>
          <p style="margin:0 0 16px;"><strong>${esc(senderName)}</strong> vous a écrit${about}&nbsp;:</p>
          <blockquote style="margin:0 0 16px;padding:12px 16px;border-left:3px solid #e11d48;background:#faf7f5;">${esc(preview)}</blockquote>
          <p style="margin:0;font-size:13px;color:#78716c;">Ne payez jamais en dehors de LeOui Market et ne communiquez pas vos coordonnées bancaires.</p>`,
        ctaLabel: 'Lire et répondre',
        ctaUrl: link,
        footerNote: 'Vous recevez cet email car vous avez une conversation sur LeOui Market.',
      });
      await deps.send({
        to,
        subject: `Nouveau message de ${senderName}`,
        html,
        text: `${senderName} vous a écrit sur LeOui Market : ${preview}\n${link}`,
      });
    },
  };
}
