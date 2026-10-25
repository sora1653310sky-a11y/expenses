import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDocs,
  getDocFromServer,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Transaction, MonthlyBudget, BabyInfo, CoupleProfile } from '../types';

// Effective Firebase configuration with optional VITE_ env overrides for Vercel
const effectiveConfig = {
  ...firebaseConfig,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || (firebaseConfig as any)?.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || (firebaseConfig as any)?.appId,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (firebaseConfig as any)?.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (firebaseConfig as any)?.authDomain,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || (firebaseConfig as any)?.firestoreDatabaseId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || (firebaseConfig as any)?.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || (firebaseConfig as any)?.messagingSenderId,
};

// Initialize Firebase App singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(effectiveConfig);

// Initialize Firestore with configured databaseId
export const db = getFirestore(app, effectiveConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Info:', JSON.stringify(errInfo));
  return errInfo;
}

// Test connection on boot per Firebase skill guidelines
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase Firestore client is currently offline or unreachable.');
    }
    return false;
  }
}

// Sanitize string document ID
export function sanitizeRoomId(rawId: string): string {
  if (!rawId) return 'BABY-8823';
  return rawId.trim().toUpperCase().replace(/[^A-Za-z0-9_-]/g, '') || 'BABY-8823';
}

/**
 * Subscribe to real-time room metadata (budget, babyInfo, couple) via onSnapshot
 */
export function subscribeToRoomMeta(
  roomId: string,
  onUpdate: (data: {
    budget?: MonthlyBudget;
    babyInfo?: BabyInfo;
    familySettings?: { couple: CoupleProfile };
    updatedAt?: number;
    updatedBy?: string;
    version?: number;
    lastDeletedTxId?: string;
    lastDeletedAt?: number;
  }) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const safeId = sanitizeRoomId(roomId);
  const roomDocRef = doc(db, 'rooms', safeId);

  return onSnapshot(
    roomDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        onUpdate(data as any);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `rooms/${safeId}`);
      if (onError) onError(error);
    }
  );
}

/**
 * Subscribe to real-time transactions collection in the room via onSnapshot
 * This guarantees instantaneous updates whenever either spouse adds, edits, or deletes a transaction!
 */
export function subscribeToRoomTransactions(
  roomId: string,
  onUpdate: (transactions: Transaction[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const safeId = sanitizeRoomId(roomId);
  const txColRef = collection(db, 'rooms', safeId, 'transactions');

  return onSnapshot(
    txColRef,
    (snapshot) => {
      const items: Transaction[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        // Ignore any tombstoned / soft-deleted records
        if (d.isDeleted || d.deleted) {
          return;
        }
        items.push({
          id: d.id || docSnap.id,
          title: d.title || '未命名項目',
          amount: typeof d.amount === 'number' ? d.amount : Number(d.amount) || 0,
          type: d.type === 'income' ? 'income' : 'expense',
          category: d.category || 'daily',
          paidBy: d.paidBy || d.payer || 'dad',
          recordedBy: d.recordedBy || 'dad',
          splitMethod: d.splitMethod || d.splitType || 'split_50_50',
          date: d.date || new Date().toISOString().split('T')[0],
          note: d.note || d.notes || '',
          createdAt: d.createdAt || Date.now(),
          updatedAt: d.updatedAt || Date.now(),
        });
      });

      // Sort newest to oldest
      items.sort((a, b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });

      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, `rooms/${safeId}/transactions`);
      if (onError) onError(error);
    }
  );
}

/**
 * Sanitize transaction object so no field is `undefined` (which causes Firestore setDoc to throw)
 */
export function cleanTransactionForFirestore(tx: Partial<Transaction> & { id: string }, roomId: string) {
  return {
    id: String(tx.id),
    type: tx.type === 'income' ? 'income' : 'expense',
    category: String(tx.category || 'daily'),
    title: String(tx.title || '未命名項目'),
    amount: typeof tx.amount === 'number' ? tx.amount : Number(tx.amount) || 0,
    date: tx.date || new Date().toISOString().split('T')[0],
    paidBy: tx.paidBy || 'dad',
    recordedBy: tx.recordedBy || 'dad',
    splitMethod: tx.splitMethod || 'split_50_50',
    note: tx.note ? String(tx.note) : '',
    tags: Array.isArray(tx.tags) ? tx.tags.map(String) : [],
    createdAt: typeof tx.createdAt === 'number' ? tx.createdAt : Date.now(),
    updatedAt: Date.now(),
    roomId: sanitizeRoomId(roomId),
  };
}

/**
 * Save or update a single transaction in Firestore
 */
export async function writeTransactionToFirestore(roomId: string, tx: Transaction): Promise<boolean> {
  const safeId = sanitizeRoomId(roomId);
  const path = `rooms/${safeId}/transactions/${tx.id}`;
  try {
    const txDocRef = doc(db, 'rooms', safeId, 'transactions', tx.id);
    const cleaned = cleanTransactionForFirestore(tx, safeId);
    await setDoc(txDocRef, cleaned, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Delete a transaction from Firestore with immediate real-time sync broadcast
 */
export async function deleteTransactionFromFirestore(
  roomId: string,
  txId: string,
  deletedBy?: string
): Promise<boolean> {
  const safeId = sanitizeRoomId(roomId);
  const path = `rooms/${safeId}/transactions/${txId}`;
  try {
    const txDocRef = doc(db, 'rooms', safeId, 'transactions', txId);
    const now = Date.now();

    // 1. Immediately write tombstone so all active onSnapshot listeners filter it out
    await setDoc(
      txDocRef,
      {
        id: txId,
        isDeleted: true,
        deletedAt: now,
        deletedBy: deletedBy || 'family',
        updatedAt: now,
        roomId: safeId,
      },
      { merge: true }
    );

    // 2. Broadcast the deletion through room metadata so the spouse's device receives immediate notification & cleanup
    const roomDocRef = doc(db, 'rooms', safeId);
    await setDoc(
      roomDocRef,
      {
        lastDeletedTxId: txId,
        lastDeletedAt: now,
        updatedAt: now,
        updatedBy: deletedBy || 'family',
      },
      { merge: true }
    );

    // 3. Clean up the transaction document from Firestore subcollection after propagation
    setTimeout(async () => {
      try {
        await deleteDoc(txDocRef);
      } catch (e) {
        // quiet cleanup
      }
    }, 2500);

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
  }
}

/**
 * Save room metadata (budget, babyInfo, couple) to Firestore
 */
export async function writeRoomMetaToFirestore(
  roomId: string,
  data: {
    budget?: MonthlyBudget;
    babyInfo?: BabyInfo;
    familySettings?: { couple: CoupleProfile };
    updatedBy?: string;
  }
): Promise<boolean> {
  const safeId = sanitizeRoomId(roomId);
  const path = `rooms/${safeId}`;
  try {
    const roomDocRef = doc(db, 'rooms', safeId);
    const cleaned: Record<string, any> = {
      roomId: safeId,
      updatedAt: Date.now(),
    };
    if (data.updatedBy !== undefined && data.updatedBy !== null) {
      cleaned.updatedBy = String(data.updatedBy);
    }
    if (data.budget !== undefined && data.budget !== null) {
      cleaned.budget = JSON.parse(JSON.stringify(data.budget));
    }
    if (data.babyInfo !== undefined && data.babyInfo !== null) {
      cleaned.babyInfo = JSON.parse(JSON.stringify(data.babyInfo));
    }
    if (data.familySettings !== undefined && data.familySettings !== null) {
      cleaned.familySettings = JSON.parse(JSON.stringify(data.familySettings));
    }

    await setDoc(roomDocRef, cleaned, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Bulk sync / seed transactions to Firestore
 */
export async function bulkUploadTransactionsToFirestore(
  roomId: string,
  transactions: Transaction[]
): Promise<boolean> {
  const safeId = sanitizeRoomId(roomId);
  try {
    const batch = writeBatch(db);
    transactions.slice(0, 450).forEach((tx) => {
      const ref = doc(db, 'rooms', safeId, 'transactions', tx.id);
      batch.set(ref, cleanTransactionForFirestore(tx, safeId));
    });
    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `rooms/${safeId}/transactions(batch)`);
    return false;
  }
}
