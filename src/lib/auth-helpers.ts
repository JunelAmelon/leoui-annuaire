import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  User,
} from 'firebase/auth';
import { auth } from './firebase';
import { setDocument, addDocument } from './db';

export interface SignUpData {
  email: string;
  password: string;
  name: string;
  partner?: string;
  phone?: string;
  eventDate?: string;
  guestCount?: number;
  budget?: number;
  role?: 'client' | 'planner';
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
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
    address: data.address || null,
    role: data.role || 'client',
    created_at: new Date(),
  });

  await setDocument('users', user.uid, {
    uid: user.uid,
    email: data.email,
    role: data.role || 'client',
    created_at: new Date().toISOString(),
  });

  await addDocument('events', {
    client_id: user.uid,
    couple_names: `${data.name}${data.partner ? ' & ' + data.partner : ''}`.trim(),
    event_date: data.eventDate || null,
    guest_count: data.guestCount || 0,
    budget: data.budget || 0,
    created_at: new Date().toISOString(),
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
