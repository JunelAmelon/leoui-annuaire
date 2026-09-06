/**
 * Helper côté client : envoie un email via l'API route /api/send-email.
 * Non-bloquant : ne throw jamais, retourne juste un booléen.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}): Promise<boolean> {
  try {
    if (!params.to) return false;
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.ok;
  } catch {
    return false;
  }
}
