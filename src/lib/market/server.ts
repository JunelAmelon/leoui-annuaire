// Composition root serveur — câble les implémentations concrètes derrière
// les interfaces (équivalent DI container pour Next.js API routes).
// ⚠️ Server-only : n'importer que depuis des API routes (firebase-admin).

import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { sendMailServer } from '@/lib/mailer';
import { createMessagingService } from './messaging-service';
import { createFirestoreMessagingStore } from './messaging-store';
import { createFirestoreDirectory } from './messaging-directory';
import { createEmailNotifier } from './messaging-notifier';
import { createFirestoreListingStore } from './listing-store';
import { createListingService } from './listing-service';
import { createOrderService } from './order-service';
import { createDisputeService } from './dispute-service';

export function getListingService() {
  return createListingService(createFirestoreListingStore(adminDb));
}

export function getOrderService() {
  return createOrderService(adminDb);
}

export function getDisputeService() {
  return createDisputeService(adminDb);
}

export function getMessagingService() {
  return createMessagingService({
    store: createFirestoreMessagingStore(adminDb),
    directory: createFirestoreDirectory(adminDb, adminAuth),
    notifier: createEmailNotifier({
      getEmail: async (uid) => (await adminAuth.getUser(uid).catch(() => null))?.email ?? null,
      send: sendMailServer,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    }),
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  });
}
