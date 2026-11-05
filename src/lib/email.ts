import { auth } from './firebase';

/**
 * Helper côté client : envoie un email via l'API route /api/send-email.
 * La route exige un utilisateur connecté : le jeton Firebase est joint automatiquement.
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
    const token = await auth.currentUser?.getIdToken();
    if (!token) return false;
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(params),
    });
    return res.ok;
  } catch {
    return false;
  }
}
