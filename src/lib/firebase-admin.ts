import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawPrivateKey) {
    const missing = [
      !projectId ? 'FIREBASE_PROJECT_ID' : null,
      !clientEmail ? 'FIREBASE_CLIENT_EMAIL' : null,
      !rawPrivateKey ? 'FIREBASE_PRIVATE_KEY' : null,
    ].filter(Boolean);
    throw new Error(`Firebase Admin env missing: ${missing.join(', ')}`);
  }

  const privateKey = rawPrivateKey.replace(/\\n/g, '\n');

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  } catch (e: any) {
    const msg = e?.message || String(e);
    throw new Error(`Firebase Admin initialization failed: ${msg}`);
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export { admin };
