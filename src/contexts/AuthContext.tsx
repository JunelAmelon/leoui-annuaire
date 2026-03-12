'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface AuthUser {
  uid: string;
  email: string | null;
  role?: 'client' | 'planner' | 'admin' | 'vendor';
  vendorType?: string;
  displayName?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

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
        });
      } catch {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role: 'client',
          displayName: firebaseUser.displayName,
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = credential.user;

    try {
      const tokenResult = await firebaseUser.getIdTokenResult(true);
      const role = (tokenResult.claims.role as string) || 'client';
      if (role === 'admin') {
        router.push('/admin');
      } else if (role === 'planner' || role === 'vendor') {
        router.push('/espace-prestataire');
      } else {
        router.push('/espace-client');
      }
    } catch {
      router.push('/espace-client');
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
