import React, {useState} from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Save,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import {useAuth} from '../../context/AuthContext';
import {formatMalayDate} from '../../lib/youtube';

export function UserProfileView() {
  const {profile, user, isAdminUser, updateProfile} = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [institution, setInstitution] = useState(profile?.institution || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [profileNotice, setProfileNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const uid = user?.uid || profile?.id || '';

  const handleCopyUid = async () => {
    if (!uid) return;
    try {
      await navigator.clipboard.writeText(uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    } catch {
      // Abaikan jika clipboard disekat
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileNotice(null);
    if (!fullName.trim()) {
      setProfileNotice({type: 'error', text: 'Nama penuh tidak boleh dikosongkan.'});
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({
        full_name: fullName,
        email,
        institution,
      });
      setProfileNotice({type: 'success', text: 'Maklumat profil berjaya disimpan.'});
    } catch (err) {
      setProfileNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan profil.',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profil &amp; Sesi Firebase</h1>
        <p className="mt-1 text-sm text-slate-600">
          Kemas kini maklumat peribadi anda dan semak status peranan yang dikawal oleh
          Firestore Security Rules.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <UserCheck className="h-5 w-5 text-emerald-700" />
            <h2 className="text-base font-semibold text-slate-900">Maklumat Pengguna</h2>
          </div>

          <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
            {profileNotice && (
              <div
                className={`flex items-start gap-2.5 rounded-lg border p-3 text-sm ${
                  profileNotice.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-red-200 bg-red-50 text-red-800'
                }`}
              >
                {profileNotice.type === 'success' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>{profileNotice.text}</span>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Alamat E-mel Rujukan
                </label>
                <input
                  type="email"
                  maxLength={160}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@institusi.edu.my"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Peranan Akaun (Dilindungi Rules)
                </label>
                <input
                  type="text"
                  disabled
                  value={
                    isAdminUser || profile?.role === 'ADMIN'
                      ? 'ADMIN (Pentadbir)'
                      : 'PELAJAR'
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm font-semibold text-emerald-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Nama Penuh</label>
              <input
                type="text"
                required
                maxLength={120}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Institusi / Kelas
              </label>
              <input
                type="text"
                maxLength={160}
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Contoh: Politeknik Ungku Omar"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
              <span>Sesi dicipta: {formatMalayDate(profile?.created_at)}</span>
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {savingProfile ? 'Menyimpan...' : 'Simpan Profil'}
              </button>
            </div>
          </form>
        </section>

        <section className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <ShieldCheck className="h-5 w-5 text-amber-700" />
            <h2 className="text-base font-semibold text-slate-900">
              Identiti Firebase &amp; Kawalan Peranan
            </h2>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              UID Firebase Authentication (Anonymous)
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 font-mono-tabular">
                {uid || '—'}
              </code>
              <button
                type="button"
                onClick={handleCopyUid}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shrink-0"
              >
                {copiedUid ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-700" /> Disalin
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Salin UID
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs leading-relaxed text-slate-600 space-y-2">
            <p className="font-semibold text-slate-800">
              Cara Pemilik Projek Melantik Pentadbir (Admin)
            </p>
            <p>
              Pelajar tidak dibenarkan menaik taraf peranan sendiri. Untuk melantik
              akaun ini sebagai <strong>ADMIN</strong>, pemilik projek{' '}
              <code className="font-mono-tabular">i-know-b18fc</code> perlu membuka{' '}
              <strong>Firebase Console &gt; Cloud Firestore</strong> dan mencipta
              dokumen dalam koleksi <code className="font-mono-tabular">admins</code>{' '}
              menggunakan UID di atas sebagai <strong>Document ID</strong> dengan medan{' '}
              <code className="font-mono-tabular">active: true</code>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
