import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {
  onAuthStateChanged,
  signInAnonymously,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import {doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  verifyFirestoreConnection,
} from '../lib/firebase';
import type {Profile} from '../types/database';

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdminUser: boolean;
  firestoreConnected: boolean | null;
  firestoreError: string | null;
  signInStudentSession: (params: {
    fullName: string;
    email?: string;
    institution?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: {
    full_name: string;
    email?: string;
    institution: string;
    avatar_url?: string | null;
  }) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toIso(val: unknown): string {
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function normalizeProfile(raw: Record<string, unknown>, isAdminDoc: boolean): Profile {
  return {
    id: String(raw.id || ''),
    full_name: String(raw.full_name || 'Pengguna I-KNOW'),
    email: String(raw.email || ''),
    role: isAdminDoc ? 'ADMIN' : raw.role === 'ADMIN' ? 'ADMIN' : 'PELAJAR',
    avatar_url: typeof raw.avatar_url === 'string' ? raw.avatar_url : null,
    institution: typeof raw.institution === 'string' ? raw.institution : '',
    is_active: raw.is_active !== false,
    created_at: toIso(raw.created_at),
    updated_at: toIso(raw.updated_at),
  };
}

function translateFirebaseAuthError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  if (lower.includes('auth/operation-not-allowed') || lower.includes('admin-restricted-operation')) {
    return 'Sesi pembelajaran tidak dapat dimulakan buat sementara waktu. Sila hubungi pentadbir sistem.';
  }
  if (lower.includes('permission') || lower.includes('insufficient')) {
    return 'Akses data tidak dibenarkan buat sementara waktu. Sila hubungi pentadbir sistem.';
  }
  if (lower.includes('network-request-failed') || lower.includes('offline')) {
    return 'Sambungan rangkaian gagal. Sila semak sambungan internet anda.';
  }
  return msg;
}

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [firestoreConnected, setFirestoreConnected] = useState<boolean | null>(null);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  const loadProfileAndAdmin = useCallback(async (uid: string): Promise<{
    prof: Profile | null;
    adminFlag: boolean;
  }> => {
    let adminFlag = false;
    try {
      const adminSnap = await getDoc(doc(db, 'admins', uid));
      adminFlag = adminSnap.exists();
    } catch {
      adminFlag = false;
    }

    const path = `profiles/${uid}`;
    try {
      const snap = await getDoc(doc(db, 'profiles', uid));
      if (!snap.exists()) {
        return {prof: null, adminFlag};
      }
      const data = snap.data() as Record<string, unknown>;
      return {
        prof: normalizeProfile(data, adminFlag),
        adminFlag,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const {prof, adminFlag} = await loadProfileAndAdmin(user.uid);
    setIsAdminUser(adminFlag);
    setProfile(prof);
  }, [loadProfileAndAdmin, user]);

  useEffect(() => {
    verifyFirestoreConnection().then((res) => {
      setFirestoreConnected(res.connected);
      setFirestoreError(res.errorMessage ?? null);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const {prof, adminFlag} = await loadProfileAndAdmin(firebaseUser.uid);
          setIsAdminUser(adminFlag);

          if (!prof && adminFlag) {
            // Auto-cipta profil untuk Admin yang telah ditambah dalam /admins/{uid}
            const adminRef = doc(db, 'profiles', firebaseUser.uid);
            await setDoc(adminRef, {
              id: firebaseUser.uid,
              full_name: 'Pentadbir I-KNOW',
              email: '',
              role: 'ADMIN',
              institution: 'Pusat Pembelajaran Ilmu Islam',
              is_active: true,
              created_at: serverTimestamp(),
              updated_at: serverTimestamp(),
            });
            const reloaded = await loadProfileAndAdmin(firebaseUser.uid);
            setProfile(reloaded.prof);
          } else {
            setProfile(prof);
          }
        } catch (err) {
          setFirestoreError(translateFirebaseAuthError(err));
          setProfile(null);
        }
      } else {
        setProfile(null);
        setIsAdminUser(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [loadProfileAndAdmin]);

  const signInStudentSession = async ({
    fullName,
    email,
    institution,
  }: {
    fullName: string;
    email?: string;
    institution?: string;
  }) => {
    const cleanName = fullName.trim().slice(0, 120);
    if (!cleanName) {
      throw new Error('Sila masukkan nama penuh anda.');
    }
    const cleanEmail = (email || '').trim().slice(0, 160);
    const cleanInstitution = (institution || '').trim().slice(0, 160);
    if (!cleanInstitution) {
      throw new Error('Sila masukkan kelas anda.');
    }

    try {
      let currentUser = auth.currentUser;
      if (!currentUser) {
        const cred = await signInAnonymously(auth);
        currentUser = cred.user;
      }

      const uid = currentUser.uid;
      let adminFlag = false;
      try {
        const adminSnap = await getDoc(doc(db, 'admins', uid));
        adminFlag = adminSnap.exists();
      } catch {
        adminFlag = false;
      }

      const profileRef = doc(db, 'profiles', uid);
      const existingSnap = await getDoc(profileRef);

      if (!existingSnap.exists()) {
        await setDoc(profileRef, {
          id: uid,
          full_name: cleanName,
          email: cleanEmail,
          role: adminFlag ? 'ADMIN' : 'PELAJAR',
          institution: cleanInstitution,
          is_active: true,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
      } else {
        await updateDoc(profileRef, {
          full_name: cleanName,
          email: cleanEmail,
          institution: cleanInstitution,
          updated_at: serverTimestamp(),
        });
      }

      const {prof, adminFlag: latestAdmin} = await loadProfileAndAdmin(uid);
      setIsAdminUser(latestAdmin);
      setProfile(prof);
    } catch (error) {
      throw new Error(translateFirebaseAuthError(error));
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
    setIsAdminUser(false);
  };

  const updateProfile = async (updates: {
    full_name: string;
    email?: string;
    institution: string;
    avatar_url?: string | null;
  }) => {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Sesi pengguna tidak ditemui.');

    const profileRef = doc(db, 'profiles', uid);
    try {
      await updateDoc(profileRef, {
        full_name: updates.full_name.trim().slice(0, 120),
        ...(updates.email !== undefined ? {email: updates.email.trim().slice(0, 160)} : {}),
        institution: updates.institution.trim().slice(0, 160),
        ...(updates.avatar_url !== undefined
          ? {avatar_url: updates.avatar_url ? updates.avatar_url.slice(0, 500) : null}
          : {}),
        updated_at: serverTimestamp(),
      });
      const {prof, adminFlag} = await loadProfileAndAdmin(uid);
      setIsAdminUser(adminFlag);
      setProfile(prof);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `profiles/${uid}`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdminUser,
        firestoreConnected,
        firestoreError,
        signInStudentSession,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth mesti digunakan di dalam AuthProvider.');
  }
  return ctx;
}
