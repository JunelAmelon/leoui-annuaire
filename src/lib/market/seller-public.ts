// Profil vendeur PUBLIC : sous-ensemble sans donnée sensible (ni email, ni téléphone,
// ni adresse précise). Partagé par la fiche annonce et la page vendeur.
// Server-only (Admin SDK).

import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import { ActivityBucket, activityBucket } from './messaging-rules';

export interface PublicSeller {
  id: string;
  display_name: string;
  status: 'particulier' | 'professionnel';
  photo_url: string | null;
  bio: string | null;
  city: string | null;
  verified: { email: boolean; phone: boolean; identity: boolean };
  rating_avg: number;
  rating_count: number;
  created_at: string;
  activity: ActivityBucket;
}

export async function loadPublicSeller(
  db: Firestore,
  auth: Auth,
  uid: string,
  nowMs: number = Date.now()
): Promise<PublicSeller | null> {
  const snap = await db.collection('market_seller_profiles').doc(uid).get();
  if (!snap.exists) return null;
  const p = snap.data() as any;

  const [emailVerified, presence] = await Promise.all([
    // Statut réel côté Firebase Auth, jamais la valeur stockée.
    auth.getUser(uid).then((u) => u.emailVerified).catch(() => false),
    db.collection('market_presence').doc(uid).get(),
  ]);

  return {
    id: uid,
    display_name: p.display_name,
    status: p.status,
    photo_url: p.photo_url ?? null,
    bio: p.bio ?? null,
    city: p.address?.city || null,
    verified: {
      email: emailVerified,
      phone: Boolean(p.verified?.phone && p.phone_verified_at),
      identity: Boolean(p.verified?.identity),
    },
    rating_avg: p.rating_avg ?? 0,
    rating_count: p.rating_count ?? 0,
    created_at: p.created_at,
    activity: activityBucket(presence.exists ? (presence.data() as any).last_seen_at : null, nowMs),
  };
}
