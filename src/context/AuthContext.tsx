import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentData,
  type DocumentReference,
} from 'firebase/firestore';
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
  isGoogleLinked: boolean;
  linkedGoogleEmail: string | null;
  firestoreConnected: boolean | null;
  firestoreError: string | null;
  signInStudentSession: (params: {
    fullName: string;
    studentClass?: string;
    institution?: string;
  }) => Promise<void>;
  linkAdminWithGoogle: () => Promise<{email: string | null}>;
  signInAdminWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: {
    full_name: string;
    class: string;
  }) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ADMIN_CANDIDATE_NAME = 'MUSLEHA BINTI MOKTER';

function isAdminLoginCandidate(fullName: string, studentClass: string): boolean {
  const normalizedName = fullName.trim().toUpperCase();
  const normalizedClass = studentClass.trim().toUpperCase();
  return (
    normalizedName === ADMIN_CANDIDATE_NAME &&
    (normalizedClass === 'ADMIN' || normalizedClass === '')
  );
}

function toIso(val: unknown): string {
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function normalizeProfile(
  raw: Record<string, unknown>,
  isAdminDoc: boolean,
  authDisplayName?: string | null
): Profile {
  const rawRole = typeof raw.role === 'string' ? raw.role.trim().toUpperCase() : '';
  const resolvedRole = isAdminDoc || rawRole === 'ADMIN' ? 'ADMIN' : 'PELAJAR';
  return {
    id: String(raw.id || ''),
    full_name: String(raw.full_name || authDisplayName || 'Pengguna I-KNOW'),
    class: String(raw.class || raw.institution || ''),
    role: resolvedRole,
    is_active: raw.is_active !== false,
    created_at: toIso(raw.created_at),
    updated_at: toIso(raw.updated_at),
  };
}

function translateFirebaseAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as {code?: unknown}).code)
      : '';
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.startsWith('ADMIN_READ_ERROR:')) {
    return msg.slice('ADMIN_READ_ERROR:'.length);
  }
  const lower = msg.toLowerCase();
  if (
    code === 'auth/credential-already-in-use' ||
    code === 'auth/email-already-in-use' ||
    code === 'auth/account-exists-with-different-credential' ||
    lower.includes('credential-already-in-use') ||
    lower.includes('email-already-in-use')
  ) {
    return 'Akaun Google ini sudah dipautkan kepada akaun Firebase lain. Sila guna akaun Google yang belum dipautkan.';
  }
  if (code === 'auth/provider-already-linked' || lower.includes('provider-already-linked')) {
    return 'Akaun pentadbir ini sudah dipautkan dengan akaun Google.';
  }
  if (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    lower.includes('popup-closed-by-user')
  ) {
    return 'Tetingkap log masuk Google ditutup sebelum proses selesai.';
  }
  if (code === 'auth/popup-blocked' || lower.includes('popup-blocked')) {
    return 'Tetingkap pop-up disekat oleh pelayar. Sila benarkan pop-up untuk laman ini dan cuba lagi.';
  }
  if (code === 'auth/unauthorized-domain' || lower.includes('unauthorized-domain')) {
    return 'Domain semasa belum didaftarkan dalam Firebase Console (Authentication > Settings > Authorized domains).';
  }
  if (lower.includes('auth/operation-not-allowed') || lower.includes('admin-restricted-operation')) {
    return 'Penyedia pengesahan yang diminta belum diaktifkan dalam Firebase Console.';
  }
  if (lower.includes('permission') || lower.includes('insufficient')) {
    return 'Akses data tidak dibenarkan buat sementara waktu. Sila hubungi pentadbir sistem.';
  }
  if (lower.includes('network-request-failed') || lower.includes('offline')) {
    return 'Sambungan rangkaian gagal. Sila semak sambungan internet anda.';
  }
  return msg;
}

async function readDocPreferServer(ref: DocumentReference<DocumentData>) {
  try {
    return await getDocFromServer(ref);
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as {code?: unknown}).code)
        : '';
    if (code === 'unavailable') {
      return await getDoc(ref);
    }
    throw error;
  }
}

function isPermissionDeniedError(error: unknown): boolean {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as {code?: unknown}).code === 'permission-denied'
  ) {
    return true;
  }
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return msg.includes('permission') || msg.includes('insufficient');
}

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);
  const [linkedGoogleEmail, setLinkedGoogleEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [firestoreConnected, setFirestoreConnected] = useState<boolean | null>(null);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const isSigningInRef = useRef(false);

  const syncGoogleProviderState = useCallback((firebaseUser: User | null) => {
    const googleInfo = firebaseUser?.providerData?.find(
      (provider) => provider.providerId === 'google.com'
    );
    setIsGoogleLinked(Boolean(googleInfo));
    setLinkedGoogleEmail(googleInfo?.email ?? (googleInfo ? firebaseUser?.email ?? null : null));
  }, []);

  const checkIsAdminUid = useCallback(async (uid: string): Promise<boolean> => {
    const activeUid = auth.currentUser?.uid || uid;
    if (!activeUid) return false;
    try {
      const adminSnap = await readDocPreferServer(doc(db, 'admins', activeUid));
      return adminSnap.exists();
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as {code?: unknown}).code)
          : 'unknown';
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Ralat membaca dokumen admins/${activeUid}:`, error);
      throw new Error(
        `ADMIN_READ_ERROR:Gagal membaca dokumen admins/${activeUid} (${code}): ${message}`
      );
    }
  }, []);

  const loadProfileAndAdmin = useCallback(
    async (
      uid: string,
      authDisplayName?: string | null
    ): Promise<{
      prof: Profile | null;
      adminFlag: boolean;
    }> => {
      const activeUid = auth.currentUser?.uid || uid;
      const adminFlag = await checkIsAdminUid(activeUid);

      const path = `profiles/${activeUid}`;
      try {
        const snap = await readDocPreferServer(doc(db, 'profiles', activeUid));
        if (!snap.exists()) {
          return {prof: null, adminFlag};
        }
        const data = snap.data() as Record<string, unknown>;
        const prof = normalizeProfile(data, adminFlag, authDisplayName);
        return {
          prof,
          adminFlag: adminFlag || prof.role === 'ADMIN',
        };
      } catch (error) {
        console.error(`Ralat membaca dokumen ${path}:`, error);
        handleFirestoreError(error, OperationType.GET, path);
      }
    },
    [checkIsAdminUid]
  );

  const createAdminProfileDoc = useCallback(
    async (uid: string, fullName: string, preferredClass: string) => {
      const profileRef = doc(db, 'profiles', uid);
      const buildPayload = (classValue: string) => ({
        id: uid,
        full_name: fullName,
        class: classValue,
        role: 'ADMIN' as const,
        is_active: true,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      try {
        await setDoc(profileRef, buildPayload(preferredClass));
      } catch (error) {
        if (preferredClass === '' && isPermissionDeniedError(error)) {
          await setDoc(profileRef, buildPayload('ADMIN'));
          return;
        }
        throw error;
      }
    },
    []
  );

  const refreshProfile = useCallback(async () => {
    await auth.authStateReady();
    const current = auth.currentUser ?? user;
    if (!current) return;
    try {
      const {prof, adminFlag} = await loadProfileAndAdmin(current.uid, current.displayName);
      setIsAdminUser(adminFlag);
      setProfile(prof);
      setFirestoreError(null);
    } catch (err) {
      setFirestoreError(translateFirebaseAuthError(err));
      throw err;
    }
  }, [loadProfileAndAdmin, user]);

  useEffect(() => {
    let active = true;

    verifyFirestoreConnection().then((res) => {
      if (!active) return;
      setFirestoreConnected(res.connected);
      if (res.errorMessage) {
        setFirestoreError(res.errorMessage);
      }
    });

    const syncUserSession = async (firebaseUser: User | null) => {
      if (!active) return;
      if (isSigningInRef.current) {
        setLoading(false);
        return;
      }
      setUser(firebaseUser);
      syncGoogleProviderState(firebaseUser);
      if (firebaseUser) {
        try {
          const {prof, adminFlag} = await loadProfileAndAdmin(
            firebaseUser.uid,
            firebaseUser.displayName
          );
          if (!active) return;
          setIsAdminUser(adminFlag);

          if (!prof && adminFlag) {
            // Auto-cipta profil untuk Admin yang UID-nya telah didaftarkan dalam /admins/{uid}
            const adminName = firebaseUser.displayName?.trim() || ADMIN_CANDIDATE_NAME;
            if (firebaseUser.displayName !== adminName) {
              await firebaseUpdateProfile(firebaseUser, {displayName: adminName}).catch(
                () => {}
              );
            }
            await createAdminProfileDoc(firebaseUser.uid, adminName, '');
            const reloaded = await loadProfileAndAdmin(firebaseUser.uid, adminName);
            if (!active) return;
            setIsAdminUser(reloaded.adminFlag);
            setProfile(reloaded.prof);
            setFirestoreError(null);
          } else {
            if (prof?.full_name && firebaseUser.displayName !== prof.full_name) {
              await firebaseUpdateProfile(firebaseUser, {
                displayName: prof.full_name,
              }).catch(() => {});
            }
            setProfile(prof);
            setFirestoreError(null);
          }
        } catch (err) {
          if (!active) return;
          console.error('Ralat memulihkan sesi dan peranan pengguna:', err);
          setFirestoreError(translateFirebaseAuthError(err));
          setIsAdminUser(false);
          setProfile(null);
        }
      } else {
        setProfile(null);
        setIsAdminUser(false);
      }
      if (active) {
        setLoading(false);
      }
    };

    let unsubscribe: (() => void) | undefined;
    void auth.authStateReady().then(() => {
      if (!active) return;
      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        void syncUserSession(firebaseUser);
      });
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [createAdminProfileDoc, loadProfileAndAdmin, syncGoogleProviderState]);

  const signInStudentSession = async ({
    fullName,
    studentClass,
    institution,
  }: {
    fullName: string;
    studentClass?: string;
    institution?: string;
  }) => {
    const cleanName = fullName.trim().slice(0, 120);
    if (!cleanName) {
      throw new Error('Sila masukkan nama penuh anda.');
    }
    const rawClass = (studentClass ?? institution ?? '').trim().slice(0, 160);
    const adminCandidate = isAdminLoginCandidate(cleanName, rawClass);

    if (!adminCandidate && !rawClass) {
      throw new Error('Sila masukkan kelas anda.');
    }

    isSigningInRef.current = true;
    try {
      // Pastikan Firebase Auth selesai memulihkan sesi sedia ada sebelum menyemak currentUser
      await auth.authStateReady();
      let currentUser = auth.currentUser;
      if (!currentUser) {
        const cred = await signInAnonymously(auth);
        currentUser = cred.user;
      }

      const uid = currentUser.uid;
      const adminFlag = await checkIsAdminUid(uid);

      // Hanya UID yang wujud dalam koleksi admins/{uid} dibenarkan sebagai ADMIN.
      // Jika bukan ADMIN dan kelas dikosongkan, pelajar wajib mengisi kelas yang sah.
      if (!adminFlag && !rawClass) {
        throw new Error('Sila masukkan kelas yang sah untuk log masuk sebagai pelajar.');
      }

      const resolvedClass = rawClass;

      if (currentUser.displayName !== cleanName) {
        await firebaseUpdateProfile(currentUser, {
          displayName: cleanName,
        });
      }

      const profileRef = doc(db, 'profiles', uid);
      const existingSnap = await readDocPreferServer(profileRef);

      if (!existingSnap.exists()) {
        if (adminFlag) {
          await createAdminProfileDoc(uid, cleanName, resolvedClass);
        } else {
          await setDoc(profileRef, {
            id: uid,
            full_name: cleanName,
            class: resolvedClass,
            role: 'PELAJAR',
            is_active: true,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
          });
        }
      } else {
        const applyUpdate = async (classValue: string) => {
          await updateDoc(profileRef, {
            full_name: cleanName,
            class: classValue,
            ...(adminFlag && existingSnap.data()?.role !== 'ADMIN' ? {role: 'ADMIN'} : {}),
            updated_at: serverTimestamp(),
          });
        };

        try {
          await applyUpdate(resolvedClass);
        } catch (error) {
          if (adminFlag && resolvedClass === '' && isPermissionDeniedError(error)) {
            await applyUpdate('ADMIN');
          } else {
            throw error;
          }
        }
      }

      setUser(auth.currentUser ?? currentUser);
      const {prof, adminFlag: latestAdmin} = await loadProfileAndAdmin(uid, cleanName);
      setIsAdminUser(latestAdmin);
      setProfile(prof);
      setFirestoreError(null);
    } catch (error) {
      throw new Error(translateFirebaseAuthError(error));
    } finally {
      isSigningInRef.current = false;
    }
  };

  const linkAdminWithGoogle = async (): Promise<{email: string | null}> => {
    await auth.authStateReady();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Tiada sesi pengguna aktif untuk dipautkan.');
    }

    const originalUid = currentUser.uid;
    const adminFlag = await checkIsAdminUid(originalUid);
    if (!adminFlag) {
      throw new Error('Hanya akaun pentadbir yang berdaftar dalam koleksi admins boleh dipautkan.');
    }

    const existingGoogle = currentUser.providerData?.find(
      (provider) => provider.providerId === 'google.com'
    );
    if (existingGoogle) {
      return {email: existingGoogle.email ?? currentUser.email ?? null};
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({prompt: 'select_account'});

    try {
      const result = await linkWithPopup(currentUser, provider);
      await result.user.reload().catch(() => {});
      const refreshedUser = auth.currentUser ?? result.user;

      if (refreshedUser.uid !== originalUid) {
        throw new Error('UID akaun berubah secara tidak dijangka semasa pautan.');
      }

      const googleInfo = refreshedUser.providerData?.find(
        (item) => item.providerId === 'google.com'
      );
      setUser(refreshedUser);
      syncGoogleProviderState(refreshedUser);

      const {prof, adminFlag: latestAdmin} = await loadProfileAndAdmin(
        originalUid,
        refreshedUser.displayName
      );
      setIsAdminUser(latestAdmin);
      setProfile(prof);
      setFirestoreError(null);

      return {email: googleInfo?.email ?? refreshedUser.email ?? null};
    } catch (error) {
      throw new Error(translateFirebaseAuthError(error));
    }
  };

  const signInAdminWithGoogle = async () => {
    if (loading) {
      await auth.authStateReady();
    }
    if (auth.currentUser && profile) {
      throw new Error(
        'Sesi pengguna masih aktif. Sila guna pautan akaun daripada Profil Admin tanpa menukar sesi aktif.'
      );
    }
    if (auth.currentUser && !profile) {
      await firebaseSignOut(auth);
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({prompt: 'select_account'});

    isSigningInRef.current = true;
    try {
      const cred = await signInWithPopup(auth, provider);
      const uid = cred.user.uid;
      const adminFlag = await checkIsAdminUid(uid);

      if (!adminFlag) {
        await firebaseSignOut(auth);
        throw new Error(
          'Akaun Google ini tidak berdaftar dalam koleksi admins. Sila pautkan akaun Google melalui sesi Admin yang sah terlebih dahulu.'
        );
      }

      const {prof} = await loadProfileAndAdmin(uid, cred.user.displayName);
      const resolvedAdminProfile: Profile = prof ?? {
        id: uid,
        full_name: cred.user.displayName?.trim() || ADMIN_CANDIDATE_NAME,
        class: 'ADMIN',
        role: 'ADMIN',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const activeUser = auth.currentUser ?? cred.user;
      setUser(activeUser);
      syncGoogleProviderState(activeUser);
      setIsAdminUser(true);
      setProfile(resolvedAdminProfile);
      setFirestoreError(null);
    } catch (error) {
      if (auth.currentUser) {
        await firebaseSignOut(auth).catch(() => {});
      }
      setUser(null);
      setProfile(null);
      setIsAdminUser(false);
      syncGoogleProviderState(null);
      throw new Error(translateFirebaseAuthError(error));
    } finally {
      isSigningInRef.current = false;
    }
  };

  const signOut = async () => {
    isSigningInRef.current = false;
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
    setIsAdminUser(false);
    setIsGoogleLinked(false);
    setLinkedGoogleEmail(null);
    setFirestoreError(null);
  };

  const updateProfile = async (updates: {
    full_name: string;
    class: string;
  }) => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Sesi pengguna tidak ditemui.');
    const uid = currentUser.uid;

    const cleanName = updates.full_name.trim().slice(0, 120);
    const cleanClass = updates.class.trim().slice(0, 160);
    if (!cleanName) throw new Error('Nama penuh tidak boleh dikosongkan.');

    const adminFlag = await checkIsAdminUid(uid);

    if (!adminFlag && !cleanClass) {
      throw new Error('Kelas tidak boleh dikosongkan.');
    }

    const profileRef = doc(db, 'profiles', uid);
    try {
      if (currentUser.displayName !== cleanName) {
        await firebaseUpdateProfile(currentUser, {
          displayName: cleanName,
        });
      }
      try {
        await updateDoc(profileRef, {
          full_name: cleanName,
          class: cleanClass,
          updated_at: serverTimestamp(),
        });
      } catch (error) {
        if (adminFlag && cleanClass === '' && isPermissionDeniedError(error)) {
          await updateDoc(profileRef, {
            full_name: cleanName,
            class: 'ADMIN',
            updated_at: serverTimestamp(),
          });
        } else {
          throw error;
        }
      }
      setUser(auth.currentUser ?? currentUser);
      const {prof, adminFlag: latestAdmin} = await loadProfileAndAdmin(uid, cleanName);
      setIsAdminUser(latestAdmin);
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
        isGoogleLinked,
        linkedGoogleEmail,
        firestoreConnected,
        firestoreError,
        signInStudentSession,
        linkAdminWithGoogle,
        signInAdminWithGoogle,
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
