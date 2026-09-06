const BRAND = {
  rose: '#E11D48',
  roseDark: '#BE123C',
  roseSoft: '#DD6B8D',
  rose50: '#FFF1F2',
  bg: '#FAF6F8',
  ink: '#1C1917',
  muted: '#78716C',
  border: '#F5E0E6',
};

export interface EmailTemplateOptions {
  title: string;
  preheader?: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  /** Ligne de texte affichée sous le bouton CTA (ex: lien de secours) */
  ctaFallbackHtml?: string;
  footerNote?: string;
}

export function renderEmailTemplate(opts: EmailTemplateOptions): string {
  const { title, preheader = '', bodyHtml, ctaLabel, ctaUrl, ctaFallbackHtml, footerNote } = opts;

  const cta = ctaLabel && ctaUrl
    ? `<div style="text-align:center;margin:32px 0 8px;">
        <a href="${ctaUrl}" style="display:inline-block;background:${BRAND.rose};color:#ffffff;font-family:Inter,Arial,sans-serif;font-size:14px;font-weight:600;letter-spacing:0.03em;padding:15px 36px;border-radius:999px;text-decoration:none;">${ctaLabel}</a>
       </div>
       ${ctaFallbackHtml ? `<p style="text-align:center;font-size:12px;color:${BRAND.muted};margin:14px 0 0;line-height:1.6;word-break:break-all;">${ctaFallbackHtml}</p>` : ''}`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:Inter,'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;color:${BRAND.ink};">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;color:${BRAND.bg};font-size:1px;">${preheader}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:44px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- LOGO -->
        <tr><td style="text-align:center;padding-bottom:28px;">
          <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
            <td style="width:40px;height:40px;background:${BRAND.rose};border-radius:50%;text-align:center;vertical-align:middle;">
              <span style="color:#ffffff;font-size:18px;line-height:40px;">&#10084;</span>
            </td>
            <td style="padding-left:12px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:400;letter-spacing:0.04em;color:${BRAND.ink};">LeOui<span style="color:${BRAND.rose};">.net</span></td>
          </tr></table>
        </td></tr>

        <!-- CARD -->
        <tr><td style="background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid ${BRAND.border};box-shadow:0 4px 24px rgba(225,29,72,0.07);">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:40px 42px 36px;">
              <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:400;color:${BRAND.ink};line-height:1.3;margin:0 0 18px;letter-spacing:-0.01em;">${title}</h1>
              <div style="width:44px;height:2px;background:${BRAND.rose};border-radius:2px;margin-bottom:22px;"></div>
              <div style="font-size:14.5px;line-height:1.75;color:#44403C;">
                ${bodyHtml}
              </div>
              ${cta}
            </td></tr>
          </table>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="padding:30px 20px 0;text-align:center;">
          <p style="font-size:12px;color:${BRAND.muted};line-height:1.7;margin:0;">
            ${footerNote || `Vous recevez cet email car vous êtes inscrit(e) sur <strong style="color:${BRAND.rose};">LeOui.net</strong>.`}
            <br/>© ${new Date().getFullYear()} LeOui.net — La plateforme du mariage parfait.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ── Templates prêts à l'emploi ── */

export function renderContactEmail(opts: { vendorName: string; clientName: string; message: string; replyEmail?: string }) {
  return renderEmailTemplate({
    title: `Nouveau message de ${opts.clientName}`,
    preheader: `${opts.clientName} vous a envoyé un message via LeOui.net`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour <strong>${opts.vendorName}</strong>,</p>
      <p style="margin:0 0 16px;">Vous avez reçu un nouveau message de <strong>${opts.clientName}</strong>&nbsp;:</p>
      <blockquote style="border-left:3px solid ${BRAND.rose};margin:0 0 20px;padding:14px 18px;background:${BRAND.rose50};border-radius:0 10px 10px 0;font-style:italic;color:#57534E;">
        «&nbsp;${opts.message}&nbsp;»
      </blockquote>
      ${opts.replyEmail ? `<p style="margin:0;font-size:13px;color:${BRAND.muted};">Répondre à : <a href="mailto:${opts.replyEmail}" style="color:${BRAND.rose};text-decoration:none;">${opts.replyEmail}</a></p>` : ''}
    `,
    ctaLabel: 'Répondre via LeOui.net',
    ctaUrl: 'https://leoui.net/espace-prestataire/contacts',
    footerNote: 'Vous recevez cet email car vous êtes prestataire sur LeOui.net.',
  });
}

export function renderWelcomeEmail(opts: { name: string }) {
  return renderEmailTemplate({
    title: 'Bienvenue sur LeOui.net',
    preheader: 'Votre compte a été créé avec succès',
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour <strong>${opts.name}</strong>,</p>
      <p style="margin:0 0 16px;">Bienvenue sur <strong>LeOui.net</strong>, la plateforme de référence pour organiser votre mariage de rêve.</p>
      <p style="margin:0 0 16px;">Votre compte est maintenant actif. Vous pouvez dès maintenant&nbsp;:</p>
      <ul style="margin:0 0 20px;padding-left:22px;color:#44403C;font-size:14px;line-height:2;">
        <li>Découvrir des centaines de prestataires certifiés</li>
        <li>Gérer votre budget et votre planning</li>
        <li>Échanger directement avec les prestataires</li>
      </ul>
    `,
    ctaLabel: 'Accéder à mon espace',
    ctaUrl: 'https://leoui.net/espace-client',
  });
}

export function renderReviewInvitationEmail(opts: { vendorName: string; link: string }) {
  const stars = `<div style="text-align:center;margin:6px 0 22px;font-size:26px;letter-spacing:6px;color:${BRAND.rose};">&#9733;&#9733;&#9733;&#9733;&#9733;</div>`;
  return renderEmailTemplate({
    title: 'Votre avis compte beaucoup',
    preheader: `${opts.vendorName} vous invite à partager votre expérience`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour,</p>
      <p style="margin:0 0 8px;"><strong>${opts.vendorName}</strong> vous invite à laisser un avis sur votre expérience.</p>
      <p style="margin:0 0 6px;color:${BRAND.muted};font-size:13.5px;">Quelques mots suffisent — votre retour aide d'autres couples et fait vivre les prestataires que vous avez aimés.</p>
      ${stars}
    `,
    ctaLabel: 'Donner mon avis',
    ctaUrl: opts.link,
    ctaFallbackHtml: `Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur&nbsp;:<br/><a href="${opts.link}" style="color:${BRAND.rose};text-decoration:none;">${opts.link}</a>`,
    footerNote: `Vous recevez cet email à la demande de <strong style="color:${BRAND.rose};">${opts.vendorName}</strong> via LeOui.net.`,
  });
}

/* ── Prestataire ── */

export function renderNewReviewEmail(opts: { vendorName: string; clientName: string; rating: number; comment: string }) {
  const stars = `<div style="margin:0 0 14px;font-size:20px;letter-spacing:4px;color:${BRAND.rose};">${'&#9733;'.repeat(opts.rating)}<span style="color:#E7E5E4;">${'&#9733;'.repeat(Math.max(0, 5 - opts.rating))}</span></div>`;
  return renderEmailTemplate({
    title: `Nouvel avis de ${opts.clientName}`,
    preheader: `${opts.clientName} a laissé un avis ${opts.rating}/5`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour <strong>${opts.vendorName}</strong>,</p>
      <p style="margin:0 0 14px;"><strong>${opts.clientName}</strong> vient de publier un avis sur votre profil&nbsp;:</p>
      ${stars}
      <blockquote style="border-left:3px solid ${BRAND.rose};margin:0 0 20px;padding:14px 18px;background:${BRAND.rose50};border-radius:0 10px 10px 0;font-style:italic;color:#57534E;">
        «&nbsp;${opts.comment}&nbsp;»
      </blockquote>
    `,
    ctaLabel: 'Voir et répondre',
    ctaUrl: 'https://leoui.net/espace-prestataire/avis',
    footerNote: 'Vous recevez cet email car vous êtes prestataire sur LeOui.net.',
  });
}

export function renderWelcomeVendorEmail(opts: { name: string; businessName?: string }) {
  return renderEmailTemplate({
    title: 'Bienvenue sur LeOui.net',
    preheader: 'Votre espace prestataire est prêt',
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour <strong>${opts.name}</strong>,</p>
      <p style="margin:0 0 16px;">Votre compte prestataire${opts.businessName ? ` pour <strong>${opts.businessName}</strong>` : ''} a été créé avec succès.</p>
      <p style="margin:0 0 16px;">Pour maximiser votre visibilité, pensez à&nbsp;:</p>
      <ul style="margin:0 0 20px;padding-left:22px;color:#44403C;font-size:14px;line-height:2;">
        <li>Compléter votre fiche (photos, description, tarifs)</li>
        <li>Activer votre lien de collecte d'avis</li>
        <li>Choisir l'abonnement adapté à vos besoins</li>
      </ul>
    `,
    ctaLabel: 'Compléter ma fiche',
    ctaUrl: 'https://leoui.net/espace-prestataire/mon-annonce',
    footerNote: 'Vous recevez cet email car vous avez créé un compte prestataire sur LeOui.net.',
  });
}

export function renderVendorStatusEmail(opts: { name: string; active: boolean }) {
  return renderEmailTemplate({
    title: opts.active ? 'Votre annonce est en ligne' : 'Votre annonce a été désactivée',
    preheader: opts.active ? 'Votre fiche est maintenant visible' : 'Information sur votre compte',
    bodyHtml: opts.active
      ? `
        <p style="margin:0 0 12px;">Bonjour <strong>${opts.name}</strong>,</p>
        <p style="margin:0 0 16px;">Bonne nouvelle&nbsp;: votre annonce a été <strong>validée et activée</strong> par notre équipe. Elle est désormais visible par les couples sur LeOui.net.</p>
      `
      : `
        <p style="margin:0 0 12px;">Bonjour <strong>${opts.name}</strong>,</p>
        <p style="margin:0 0 16px;">Votre annonce a été <strong>désactivée</strong> et n'apparaît plus dans les résultats. Si vous pensez qu'il s'agit d'une erreur, contactez-nous.</p>
      `,
    ctaLabel: 'Accéder à mon espace',
    ctaUrl: 'https://leoui.net/espace-prestataire',
    footerNote: 'Vous recevez cet email car vous êtes prestataire sur LeOui.net.',
  });
}

/* ── Client ── */

export function renderClientMessageEmail(opts: { clientName: string; senderName: string; message: string }) {
  return renderEmailTemplate({
    title: `Nouveau message de ${opts.senderName}`,
    preheader: `${opts.senderName} vous a répondu via LeOui.net`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour <strong>${opts.clientName}</strong>,</p>
      <p style="margin:0 0 16px;"><strong>${opts.senderName}</strong> vous a envoyé un message&nbsp;:</p>
      <blockquote style="border-left:3px solid ${BRAND.rose};margin:0 0 20px;padding:14px 18px;background:${BRAND.rose50};border-radius:0 10px 10px 0;font-style:italic;color:#57534E;">
        «&nbsp;${opts.message}&nbsp;»
      </blockquote>
    `,
    ctaLabel: 'Lire et répondre',
    ctaUrl: 'https://leoui.net/espace-client/messages',
    footerNote: 'Vous recevez cet email car vous êtes inscrit(e) sur LeOui.net.',
  });
}

export function renderReviewReplyEmail(opts: { clientName: string; vendorName: string; reply: string }) {
  return renderEmailTemplate({
    title: `${opts.vendorName} a répondu à votre avis`,
    preheader: 'Votre avis a reçu une réponse',
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour <strong>${opts.clientName}</strong>,</p>
      <p style="margin:0 0 16px;"><strong>${opts.vendorName}</strong> a répondu à l'avis que vous avez laissé&nbsp;:</p>
      <blockquote style="border-left:3px solid ${BRAND.rose};margin:0 0 20px;padding:14px 18px;background:${BRAND.rose50};border-radius:0 10px 10px 0;font-style:italic;color:#57534E;">
        «&nbsp;${opts.reply}&nbsp;»
      </blockquote>
    `,
    ctaLabel: 'Voir l\'avis',
    ctaUrl: 'https://leoui.net/espace-client/prestataires',
    footerNote: 'Vous recevez cet email car vous êtes inscrit(e) sur LeOui.net.',
  });
}

export function renderContractEmail(opts: { clientName: string; vendorName: string; contractName?: string }) {
  return renderEmailTemplate({
    title: 'Vous avez reçu un contrat',
    preheader: `${opts.vendorName} vous a envoyé un contrat à signer`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour <strong>${opts.clientName}</strong>,</p>
      <p style="margin:0 0 16px;"><strong>${opts.vendorName}</strong> vous a envoyé ${opts.contractName ? `le contrat <strong>«&nbsp;${opts.contractName}&nbsp;»</strong>` : 'un contrat'} à consulter et signer.</p>
      <p style="margin:0 0 6px;color:${BRAND.muted};font-size:13.5px;">Retrouvez-le dans votre espace client, rubrique Documents / Contrats.</p>
    `,
    ctaLabel: 'Consulter le contrat',
    ctaUrl: 'https://leoui.net/espace-client/documents',
    footerNote: 'Vous recevez cet email car vous êtes inscrit(e) sur LeOui.net.',
  });
}

/* ── Abonnement (webhooks Stripe / PayPal) ── */

export function renderSubscriptionConfirmedEmail(opts: { name: string; planName: string; provider: string }) {
  return renderEmailTemplate({
    title: 'Votre abonnement est actif',
    preheader: `Abonnement ${opts.planName} confirmé`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour <strong>${opts.name}</strong>,</p>
      <p style="margin:0 0 16px;">Votre abonnement <strong>${opts.planName}</strong> (via ${opts.provider}) a été activé avec succès. Vos avantages sont immédiatement disponibles.</p>
    `,
    ctaLabel: 'Voir mon abonnement',
    ctaUrl: 'https://leoui.net/espace-prestataire/abonnement',
    footerNote: 'Vous recevez cet email suite à un paiement sur LeOui.net.',
  });
}

export function renderSubscriptionCanceledEmail(opts: { name: string }) {
  return renderEmailTemplate({
    title: 'Votre abonnement a été résilié',
    preheader: 'Confirmation de résiliation',
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour <strong>${opts.name}</strong>,</p>
      <p style="margin:0 0 16px;">Votre abonnement LeOui.net a été résilié. Votre compte repasse en formule gratuite — votre fiche reste visible avec les fonctionnalités de base.</p>
      <p style="margin:0 0 6px;color:${BRAND.muted};font-size:13.5px;">Vous pouvez vous réabonner à tout moment depuis votre espace.</p>
    `,
    ctaLabel: 'Gérer mon abonnement',
    ctaUrl: 'https://leoui.net/espace-prestataire/abonnement',
    footerNote: 'Vous recevez cet email suite à un changement sur votre abonnement LeOui.net.',
  });
}

export function renderPaymentFailedEmail(opts: { name: string }) {
  return renderEmailTemplate({
    title: 'Un paiement a échoué',
    preheader: 'Action requise sur votre abonnement',
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour <strong>${opts.name}</strong>,</p>
      <p style="margin:0 0 16px;">Le dernier paiement de votre abonnement LeOui.net <strong>n'a pas abouti</strong>. Pour conserver vos avantages, mettez à jour votre moyen de paiement.</p>
    `,
    ctaLabel: 'Mettre à jour mon paiement',
    ctaUrl: 'https://leoui.net/espace-prestataire/abonnement',
    footerNote: 'Vous recevez cet email suite à un échec de paiement sur LeOui.net.',
  });
}

/* ── Admin ── */

export function renderAdminAlertEmail(opts: { title: string; lines: string[] }) {
  return renderEmailTemplate({
    title: opts.title,
    preheader: opts.title,
    bodyHtml: `
      <ul style="margin:0;padding-left:22px;color:#44403C;font-size:14px;line-height:2;">
        ${opts.lines.map(l => `<li>${l}</li>`).join('')}
      </ul>
    `,
    ctaLabel: 'Ouvrir l\'admin',
    ctaUrl: 'https://leoui.net/admin',
    footerNote: 'Notification interne LeOui.net — réservée à l\'équipe.',
  });
}

export function renderContactFormEmail(opts: { name: string; email: string; subject: string; message: string }) {
  return renderEmailTemplate({
    title: `Contact : ${opts.subject}`,
    preheader: `Nouveau message de ${opts.name} via le formulaire de contact`,
    bodyHtml: `
      <p style="margin:0 0 12px;"><strong>${opts.name}</strong> (<a href="mailto:${opts.email}" style="color:${BRAND.rose};text-decoration:none;">${opts.email}</a>) a envoyé un message via le formulaire de contact&nbsp;:</p>
      <blockquote style="border-left:3px solid ${BRAND.rose};margin:0 0 20px;padding:14px 18px;background:${BRAND.rose50};border-radius:0 10px 10px 0;color:#57534E;">
        ${opts.message}
      </blockquote>
    `,
    footerNote: 'Notification interne LeOui.net — formulaire de contact public.',
  });
}
