import {initializeApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {doc, getDocFromServer, getFirestore} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCJrtFosTRlC_rfmps7buJ0Qbo_rjzSyGc',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'i-know-b18fc.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'i-know-b18fc',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'i-know-b18fc.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '490403034156',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:490403034156:web:5c0bb15e04797c794c4d89',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-4FZ040E77L',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

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
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface FirebaseConnectionResult {
  connected: boolean;
  errorMessage?: string;
}

export async function verifyFirestoreConnection(): Promise<FirebaseConnectionResult> {
  try {
    await getDocFromServer(doc(db, 'system', 'health'));
    return {connected: true};
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Permission-denied indicates Firestore server responded cleanly (online & reachable)
    if (
      message.toLowerCase().includes('permission') ||
      message.toLowerCase().includes('insufficient')
    ) {
      return {connected: true};
    }
    return {
      connected: false,
      errorMessage: message,
    };
  }
}
