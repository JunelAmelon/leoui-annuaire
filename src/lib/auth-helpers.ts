import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  User,
} from 'firebase/auth';
import { auth } from './firebase';
import { setDocument } from './db';

export interface SignUpData {
  email: string;
  password: string;
  name: string;
  partner?: string;
  phone?: string;
  role?: 'client' | 'planner';
}

export async function signUp(data: SignUpData): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, data.email, data.password);
  const user = credential.user;

  await updateProfile(user, {
    displayName: data.name,
  });

  await setDocument('profiles', user.uid, {
    uid: user.uid,
    email: data.email,
    name: data.name,
    partner: data.partner || null,
    phone: data.phone || null,
    role: data.role || 'client',
    created_at: new Date(),
  });

  return user;
}

export async function signIn(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}
