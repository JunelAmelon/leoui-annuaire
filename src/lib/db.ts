import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
  query,
  where,
  orderBy,
  limit,
  WhereFilterOp,
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';

export type QueryFilter = {
  field: string;
  operator: WhereFilterOp;
  value: unknown;
};

export async function getDocument(collectionName: string, id: string): Promise<DocumentData | null> {
  const docRef = doc(db, collectionName, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() };
}

export async function getDocuments(
  collectionName: string,
  filters: QueryFilter[] = []
): Promise<DocumentData[]> {
  const colRef = collection(db, collectionName);
  let q = query(colRef);

  for (const filter of filters) {
    if (filter.field === '__name__') {
      const docRef = doc(db, collectionName, filter.value as string);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return [];
      return [{ id: snap.id, ...snap.data() }];
    }
    q = query(q, where(filter.field, filter.operator, filter.value));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addDocument(
  collectionName: string,
  data: DocumentData
): Promise<{ id: string }> {
  const colRef = collection(db, collectionName);
  const docRef = await addDoc(colRef, data);
  return { id: docRef.id };
}

export async function setDocument(
  collectionName: string,
  id: string,
  data: DocumentData
): Promise<void> {
  const docRef = doc(db, collectionName, id);
  await setDoc(docRef, data);
}

export async function updateDocument(
  collectionName: string,
  id: string,
  data: Partial<DocumentData>
): Promise<void> {
  const docRef = doc(db, collectionName, id);
  try {
    await updateDoc(docRef, data);
  } catch (err: any) {
    if (err?.code === 'not-found') {
      await setDoc(docRef, data as DocumentData, { merge: true });
      return;
    }
    throw err;
  }
}

export async function incrementDocumentFields(
  collectionName: string,
  id: string,
  fields: Record<string, number>
): Promise<void> {
  const data: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    data[k] = increment(v);
  }
  await updateDocument(collectionName, id, data);
}

export async function deleteDocument(collectionName: string, id: string): Promise<void> {
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
}
