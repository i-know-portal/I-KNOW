import React, {useState} from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Compass,
  GraduationCap,
  ShieldCheck,
  User,
} from 'lucide-react';
import {PORTAL_MEDIA} from '../../assets/media';
import {useAuth} from '../../context/AuthContext';

export function AuthPortal() {
  const {signInStudentSession, signInAdminWithGoogle, firestoreError} = useAuth();

  const [fullName, setFullName] = useState('');
  const [kelas, setKelas] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const displayedError = errorMsg || firestoreError;

  const isAdminCandidateName =
    fullName.trim().toUpperCase() === 'MUSLEHA BINTI MOKTER';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const trimmedName = fullName.trim();
    const trimmedClass = kelas.trim();
    const isAdminCandidate =
      trimmedName.toUpperCase() === 'MUSLEHA BINTI MOKTER' &&
      (trimmedClass === '' || trimmedClass.toUpperCase() === 'ADMIN');

    if (!trimmedName) {
      setErrorMsg('Sila masukkan nama penuh anda sebelum meneruskan.');
      return;
    }
    if (!isAdminCandidate && !trimmedClass) {
      setErrorMsg('Sila masukkan kelas anda sebelum meneruskan.');
      return;
    }

    setSubmitting(true);
    try {
      await signInStudentSession({
        fullName,
        studentClass: kelas,
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal memulakan sesi pembelajaran.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminGoogleSignIn = async () => {
    setErrorMsg(null);
    setGoogleSubmitting(true);
    try {
      await signInAdminWithGoogle();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal log masuk menggunakan akaun Google.'
      );
    } finally {
      setGoogleSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
          <span className="text-lg font-bold tracking-tight text-emerald-900 whitespace-nowrap shrink-0">
            I-KNOW
          </span>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <span className="whitespace-nowrap shrink-0">Pembelajaran Solat</span>
            <span className="whitespace-nowrap shrink-0">Pembelajaran Tajwid</span>
            <span className="whitespace-nowrap shrink-0">Kuiz Interaktif</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-10 px-6 py-10 lg:grid-cols-12 items-stretch">
        {/* Panel Pengenalan Kurikulum */}
        <section className="order-2 lg:order-1 lg:col-span-7 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-emerald-950">
            <img
              src={PORTAL_MEDIA.heroPortal}
              alt="Seni bina pusat pembelajaran ilmu Islam I-KNOW"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/40 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <p className="text-xs font-semibold tracking-widest text-amber-300">
                ILMU • AMALAN • PENGHAYATAN
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">
                Pusat Pembelajaran Ilmu Islam Digital
              </h1>
              <p className="mt-2 max-w-xl text-sm text-emerald-50/90">
                Islamic Knowledge &amp; Learning — Platform kendiri bagi menguasai
                ibadah Solat dan ilmu Tajwid al-Quran secara sistematik dan interaktif.
              </p>
            </div>
          </div>

          <div className="grid gap-6 p-6 sm:grid-cols-2">
            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-5">
              <div>
                <div className="flex items-center gap-2.5 text-emerald-800">
                  <Compass className="h-5 w-5" />
                  <h2 className="text-base font-semibold">Modul 1: Pembelajaran Solat</h2>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Merangkumi 10 topik tersusun daripada pengenalan solat, wuduk,
                  syarat sah, 13 rukun solat, bacaan dalam solat hingga solat
                  berjemaah dan pembetulan kesilapan lazim.
                </p>
              </div>
              <p className="mt-4 text-xs font-medium text-slate-500">
                10 Topik · Nota · Audio/Video · Kuiz
              </p>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-5">
              <div>
                <div className="flex items-center gap-2.5 text-emerald-800">
                  <BookOpen className="h-5 w-5" />
                  <h2 className="text-base font-semibold">Modul 2: Pembelajaran Tajwid</h2>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Menguasai Nun Sakinah dan Tanwin, Mim Sakinah, hukum Mad,
                  Qalqalah, hukum Ra, Makharij al-Huruf, Sifat Huruf serta
                  Waqaf dan Ibtida&apos;.
                </p>
              </div>
              <p className="mt-4 text-xs font-medium text-slate-500">
                10 Topik · Contoh Ayat · Latihan Hukum
              </p>
            </div>
          </div>
        </section>

        {/* Borang Log Masuk Pelajar */}
        <section className="order-1 lg:order-2 lg:col-span-5 flex flex-col justify-center rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Portal Pembelajaran I-KNOW
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Mulakan Sesi Pembelajaran Anda
            </h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Masukkan nama penuh dan kelas anda untuk mengakses modul pembelajaran
              serta kuiz interaktif.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {displayedError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{displayedError}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Nama Penuh <span className="text-red-600">*</span>
              </label>
              <div className="relative mt-1.5">
                <User className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  placeholder="Contoh: Ahmad bin Abdullah"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Kelas{' '}
                {!isAdminCandidateName && <span className="text-red-600">*</span>}
              </label>
              <div className="relative mt-1.5">
                <GraduationCap className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required={!isAdminCandidateName}
                  maxLength={160}
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  placeholder="Contoh: DKA 1A / 4 Ibnu Sina"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || googleSubmitting}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
            >
              {submitting ? 'Memulakan Sesi...' : 'Masuk Portal Pembelajaran'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-6 space-y-3 border-t border-slate-200 pt-5">
            <p className="text-center text-xs font-medium text-slate-500">
              Akses Pentadbir Berdaftar
            </p>
            <button
              type="button"
              onClick={handleAdminGoogleSignIn}
              disabled={submitting || googleSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-emerald-50/70 px-4 py-2.5 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-100 disabled:opacity-60"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>
                {googleSubmitting
                  ? 'Mengesahkan Akaun Google...'
                  : 'LOG MASUK PENTADBIR (GOOGLE)'}
              </span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
