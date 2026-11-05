'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut,
  signInWithPopup, GoogleAuthProvider, updateProfile,
  User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { getDocument, getDocuments, setDocument, addDocument } from '@/lib/db';

interface AuthUser {
  uid: string;
  email: string | null;
  role?: 'client' | 'planner' | 'admin' | 'vendor';
  vendorType?: string;
  displayName?: string | null;
  photoURL?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  /** Le compte possède un projet mariage (doc `events`) → accès Espace couple. */
  hasCoupleSpace: boolean;
  signIn: (email: string, password: string, redirectTo?: string) => Promise<void>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ isNew: boolean }>;
  signOut: () => Promise<void>;
  signOutTo: (path: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  hasCoupleSpace: false,
  signIn: async () => {},
  signInWithGoogle: async () => ({ isNew: false }),
  signOut: async () => {},
  signOutTo: async () => {},
  refreshUser: async () => {},
});

function getRoleDashboard(role?: string) {
  if (role === 'admin') return '/admin';
  if (role === 'planner' || role === 'vendor') return '/espace-prestataire';
  return '/espace-client';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCoupleSpace, setHasCoupleSpace] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (!firebaseUser) {
        setUser(null);
        setHasCoupleSpace(false);
        setLoading(false);
        return;
      }

      // Lecture du profil : displayName + couple_space — un seul doc read, AVANT
      // setLoading(false) → pas de flash dans le menu.
      let displayName = firebaseUser.displayName;
      let coupleSpaceFromProfile = false;
      try {
        const profile = (await getDocument('profiles', firebaseUser.uid)) as {
          name?: string;
          couple_space?: boolean;
        } | null;

        // displayName absent → on prend le nom du profil et on répare Firebase.
        if (!displayName && profile?.name) {
          displayName = profile.name;
          updateProfile(firebaseUser, { displayName }).catch(() => {});
        }

        if (profile?.couple_space === true) {
          coupleSpaceFromProfile = true;
        } else if (profile && !('couple_space' in profile)) {
          // Ancien compte (créé avant le flag) : on vérifie les events et on migre
          // silencieusement pour que la prochaine connexion soit instantanée.
          const events = await getDocuments('events', [
            { field: 'client_id', operator: '==', value: firebaseUser.uid },
          ]);
          coupleSpaceFromProfile = events.length > 0;
          if (coupleSpaceFromProfile) {
            setDocument('profiles', firebaseUser.uid, { couple_space: true }).catch(() => {});
          }
        }
      } catch {
        /* profil inaccessible : pas d'espace couple par défaut */
      }
      setHasCoupleSpace(coupleSpaceFromProfile);

      try {
        const tokenResult = await firebaseUser.getIdTokenResult(true);
        const role = (tokenResult.claims.role as string) || 'client';
        const vendorType = (tokenResult.claims.vendorType as string) || undefined;
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role: role as AuthUser['role'],
          vendorType,
          displayName,
          photoURL: firebaseUser.photoURL,
        });
      } catch {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role: 'client',
          displayName,
          photoURL: firebaseUser.photoURL,
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string, redirectTo?: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = credential.user;

    try {
      const tokenResult = await firebaseUser.getIdTokenResult(true);
      const role = (tokenResult.claims.role as string) || 'client';
      router.push(redirectTo && redirectTo.startsWith('/') ? redirectTo : getRoleDashboard(role));
    } catch {
      router.push(redirectTo && redirectTo.startsWith('/') ? redirectTo : getRoleDashboard('client'));
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    router.push('/login');
  };

  const signOutTo = async (path: string) => {
    await firebaseSignOut(auth);
    router.push(path.startsWith('/') ? path : '/login');
  };

  // Recharge nom / photo après une modification de profil (onAuthStateChanged ne se redéclenche pas).
  const refreshUser = async () => {
    const fu = auth.currentUser;
    if (!fu) return;
    await fu.reload();
    setUser((prev) => (prev ? { ...prev, displayName: fu.displayName, photoURL: fu.photoURL } : prev));
  };

  const handleSocialLogin = async (firebaseUser: User, redirectTo?: string): Promise<{ isNew: boolean }> => {
    let isNew = false;
    let role = 'client';
    try {
      const existing = await getDocument('profiles', firebaseUser.uid);
      if (!existing) {
        isNew = true;
        await setDocument('profiles', firebaseUser.uid, {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || '',
          role: 'client',
          created_at: new Date(),
        });
        await setDocument('users', firebaseUser.uid, {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role: 'client',
          created_at: new Date().toISOString(),
        });
        const marketOnly = !!redirectTo && (redirectTo.startsWith('/market') || redirectTo.startsWith('/app/market'));
        if (!marketOnly) {
          await addDocument('events', {
            client_id: firebaseUser.uid,
            couple_names: firebaseUser.displayName || '',
            event_date: null,
            created_at: new Date().toISOString(),
          });
        }
      }
      const tokenResult = await firebaseUser.getIdTokenResult(true);
      role = (tokenResult.claims.role as string) || 'client';
      router.push(redirectTo && redirectTo.startsWith('/') ? redirectTo : getRoleDashboard(role));
    } catch {
      router.push(redirectTo && redirectTo.startsWith('/') ? redirectTo : getRoleDashboard(role));
    }
    return { isNew };
  };

  const signInWithGoogle = async (redirectTo?: string): Promise<{ isNew: boolean }> => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    return handleSocialLogin(result.user, redirectTo);
  };

  return (
    <AuthContext.Provider value={{ user, loading, hasCoupleSpace, signIn, signInWithGoogle, signOut, signOutTo, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
