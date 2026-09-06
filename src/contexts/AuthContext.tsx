'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut,
  signInWithPopup, GoogleAuthProvider,
  User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { getDocument, setDocument, addDocument } from '@/lib/db';

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
  signIn: (email: string, password: string, redirectTo?: string) => Promise<void>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ isNew: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signInWithGoogle: async () => ({ isNew: false }),
  signOut: async () => {},
});

function getRoleDashboard(role?: string) {
  if (role === 'admin') return '/admin';
  if (role === 'planner' || role === 'vendor') return '/espace-prestataire';
  return '/espace-client';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const tokenResult = await firebaseUser.getIdTokenResult(true);
        const role = (tokenResult.claims.role as string) || 'client';
        const vendorType = (tokenResult.claims.vendorType as string) || undefined;
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role: role as AuthUser['role'],
          vendorType,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
      } catch {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role: 'client',
          displayName: firebaseUser.displayName,
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
        await addDocument('events', {
          client_id: firebaseUser.uid,
          couple_names: firebaseUser.displayName || '',
          event_date: null,
          created_at: new Date().toISOString(),
        });
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
    <AuthContext.Provider value={{ user, loading, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
