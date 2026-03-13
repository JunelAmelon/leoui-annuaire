export interface EmailTemplateOptions {
  title: string;
  preheader?: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}

export function renderEmailTemplate(opts: EmailTemplateOptions): string {
  const { title, preheader = '', bodyHtml, ctaLabel, ctaUrl, footerNote } = opts;

  const cta = ctaLabel && ctaUrl
    ? `<div style="text-align:center;margin:32px 0 8px;">
        <a href="${ctaUrl}" style="display:inline-block;background:#C0392B;color:#ffffff;font-family:Inter,Arial,sans-serif;font-size:14px;font-weight:600;letter-spacing:0.04em;padding:14px 32px;border-radius:10px;text-decoration:none;">${ctaLabel}</a>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F7F4EF;font-family:Inter,Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#2C2C2C;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;color:#F7F4EF;font-size:1px;">${preheader}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EF;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- HEADER -->
        <tr><td style="text-align:center;padding-bottom:24px;">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;background:#C0392B;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;">
              <span style="color:#fff;font-size:16px;">♥</span>
            </div>
            <span style="font-family:Georgia,serif;font-size:22px;font-weight:300;letter-spacing:0.06em;color:#1a1a1a;">LeOui</span>
          </div>
        </td></tr>

        <!-- CARD -->
        <tr><td style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06);">
          <!-- top accent bar -->
          <div style="height:4px;background:linear-gradient(90deg,#C0392B 0%,#E8C49A 100%);"></div>

          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:36px 40px 32px;">
              <!-- Title -->
              <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:300;color:#1a1a1a;line-height:1.25;margin:0 0 20px;letter-spacing:-0.01em;">${title}</h1>
              <!-- Divider -->
              <div style="height:1px;background:#EDE8E3;margin-bottom:20px;"></div>
              <!-- Body -->
              <div style="font-size:14px;line-height:1.7;color:#4a4a4a;">
                ${bodyHtml}
              </div>
              ${cta}
            </td></tr>
          </table>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="padding:28px 16px 0;text-align:center;">
          <p style="font-size:12px;color:#9a9490;line-height:1.6;margin:0;">
            ${footerNote || 'Vous recevez cet email car vous êtes inscrit(e) sur <strong style="color:#C0392B;">LeOui</strong>.'}
            <br/>© ${new Date().getFullYear()} LeOui — La plateforme du mariage parfait.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Helpers prêts à l'emploi */
export function renderContactEmail(opts: { vendorName: string; clientName: string; message: string; replyEmail?: string }) {
  return renderEmailTemplate({
    title: `Nouveau message de ${opts.clientName}`,
    preheader: `${opts.clientName} vous a envoyé un message via LeOui`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour <strong>${opts.vendorName}</strong>,</p>
      <p style="margin:0 0 16px;">Vous avez reçu un nouveau message de <strong>${opts.clientName}</strong>&nbsp;:</p>
      <blockquote style="border-left:3px solid #C0392B;margin:0 0 20px;padding:12px 16px;background:#FDF9F7;border-radius:0 8px 8px 0;font-style:italic;color:#5a5a5a;">
        "${opts.message}"
      </blockquote>
      ${opts.replyEmail ? `<p style="margin:0;font-size:13px;color:#6a6a6a;">Répondre à : <a href="mailto:${opts.replyEmail}" style="color:#C0392B;">${opts.replyEmail}</a></p>` : ''}
    `,
    ctaLabel: 'Répondre via LeOui',
    ctaUrl: 'https://leoui.fr/espace-prestataire/contacts',
    footerNote: 'Vous recevez cet email car vous êtes prestataire sur LeOui.',
  });
}

export function renderDevisEmail(opts: { clientName: string; vendorName: string; reference: string; amount: number; pdfUrl?: string }) {
  return renderEmailTemplate({
    title: `Devis de ${opts.vendorName}`,
    preheader: `Votre devis ${opts.reference} — ${opts.amount.toLocaleString('fr-FR')} € est disponible`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour <strong>${opts.clientName}</strong>,</p>
      <p style="margin:0 0 16px;"><strong>${opts.vendorName}</strong> vous a envoyé un devis&nbsp;:</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #EDE8E3;border-radius:10px;overflow:hidden;margin-bottom:20px;">
        <tr style="background:#FDF9F7;"><td style="padding:12px 16px;font-size:13px;color:#6a6a6a;border-bottom:1px solid #EDE8E3;">Référence</td><td style="padding:12px 16px;font-size:13px;font-weight:600;border-bottom:1px solid #EDE8E3;">${opts.reference}</td></tr>
        <tr><td style="padding:12px 16px;font-size:13px;color:#6a6a6a;">Montant TTC</td><td style="padding:12px 16px;font-size:15px;font-weight:700;color:#C0392B;">${opts.amount.toLocaleString('fr-FR')} €</td></tr>
      </table>
    `,
    ctaLabel: 'Consulter le devis',
    ctaUrl: opts.pdfUrl || 'https://leoui.fr/espace-client/documents',
  });
}

export function renderWelcomeEmail(opts: { name: string }) {
  return renderEmailTemplate({
    title: 'Bienvenue sur LeOui !',
    preheader: 'Votre compte a été créé avec succès',
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour <strong>${opts.name}</strong>,</p>
      <p style="margin:0 0 16px;">Bienvenue sur <strong>LeOui</strong>, la plateforme de référence pour organiser votre mariage de rêve.</p>
      <p style="margin:0 0 16px;">Votre compte est maintenant actif. Vous pouvez dès maintenant&nbsp;:</p>
      <ul style="margin:0 0 20px;padding-left:20px;color:#4a4a4a;font-size:14px;line-height:2;">
        <li>Découvrir des centaines de prestataires certifiés</li>
        <li>Gérer votre budget et votre planning</li>
        <li>Échanger directement avec les prestataires</li>
      </ul>
    `,
    ctaLabel: 'Accéder à mon espace',
    ctaUrl: 'https://leoui.fr/espace-client',
  });
}
