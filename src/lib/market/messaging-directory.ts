// Annuaire des identités publiques pour la messagerie (Firestore + Firebase Auth).
// N'expose jamais d'email : seulement un nom d'affichage et une photo.

import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import { MessagingDirectory } from './messaging-ports';

export function createFirestoreDirectory(db: Firestore, auth: Auth): MessagingDirectory {
  const profiles = () => db.collection('market_seller_profiles');

  return {
    async getParticipant(userId) {
      const profile = await profiles().doc(userId).get();
      if (profile.exists) {
        const p = profile.data() as { display_name?: string; photo_url?: string | null };
        return { display_name: p.display_name || 'Utilisateur', photo_url: p.photo_url ?? null };
      }
      try {
        const u = await auth.getUser(userId);
        return { display_name: u.displayName || 'Utilisateur', photo_url: u.photoURL ?? null };
      } catch {
        return null;
      }
    },

    async getListing(listingId) {
      const s = await db.collection('market_listings').doc(listingId).get();
      if (!s.exists) return null;
      const l = s.data() as {
        seller_id: string; title: string; images?: string[]; price: number; slug: string; status: string;
      };
      return {
        id: s.id,
        seller_id: l.seller_id,
        title: l.title,
        image: l.images?.[0] ?? null,
        price: l.price,
        slug: l.slug,
        status: l.status,
      };
    },

    async hasSellerProfile(userId) {
      return (await profiles().doc(userId).get()).exists;
    },
  };
}
