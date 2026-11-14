import {useEffect, useMemo, useState} from 'react';
import {AlertCircle, CheckCircle2, Info, Loader2, Search, UserCheck, UserX} from 'lucide-react';
import {useAuth} from '../../context/AuthContext';
import {formatMalayDate} from '../../lib/youtube';
import {
  adminUpdateUserProfile,
  fetchAdminDashboardOverview,
} from '../../services/learningService';
import type {
  ActivityLog,
  LearningProgress,
  Profile,
  QuizAttempt,
  Topic,
} from '../../types/database';

export function AdminStudentsReport() {
  const {user: currentUser} = useAuth();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [progress, setProgress] = useState<LearningProgress[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [notice, setNotice] = useState<{type: 'success' | 'error'; text: string} | null>(
    null
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminDashboardOverview();
      setProfiles(res.profiles);
      setTopics(res.topics.filter((t) => t.status === 'Published'));
      setAttempts(res.attempts);
      setProgress(res.progress);
      setLogs(res.recentLogs);
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memuatkan laporan pelajar.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return profiles
      .filter((p) => {
        if (!q) return true;
        return (
          p.full_name.toLowerCase().includes(q) ||
          (p.class || p.institution || '').toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
        );
      })
      .map((p) => {
        const userProgress = progress.filter(
          (pr) => pr.student_id === p.id && pr.is_completed
        );
        const pct =
          topics.length > 0
            ? Math.round((userProgress.length / topics.length) * 100)
            : 0;
        const userAttempts = attempts.filter((a) => a.student_id === p.id);
        const avgScore =
          userAttempts.length > 0
            ? Math.round(
                userAttempts.reduce((s, a) => s + Number(a.score), 0) /
                  userAttempts.length
              )
            : null;
        const lastLog = logs.find((l) => l.user_id === p.id);
        return {
          profile: p,
          completedCount: userProgress.length,
          completionPercent: pct,
          attemptsCount: userAttempts.length,
          avgScore,
          lastActivity: lastLog?.created_at || userAttempts[0]?.completed_at || null,
        };
      });
  }, [profiles, topics.length, progress, attempts, logs, search]);

  const handleToggleActive = async (p: Profile) => {
    if (p.id === currentUser?.uid) {
      setNotice({
        type: 'error',
        text: 'Anda tidak boleh menyahaktifkan akaun pentadbir anda sendiri.',
      });
      return;
    }
    try {
      await adminUpdateUserProfile(p.id, {is_active: !p.is_active});
      await loadData();
      setNotice({
        type: 'success',
        text: `Status akaun ${p.full_name} berjaya dikemas kini.`,
      });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal mengemas kini status pengguna.',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-16 text-sm text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
        Memuatkan senarai dan prestasi pelajar...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Pengurusan Akaun &amp; Laporan Kemajuan Pelajar
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Pantau pencapaian topik, markah kuiz, tarikh aktiviti terakhir dan kawal
            status aktif akaun pengguna.
          </p>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, kelas atau UID..."
            className="w-64 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-emerald-600 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
        <p>
          Demi keselamatan, hak akses <strong>ADMIN</strong> tidak boleh diubah melalui
          aplikasi web. Pelantikan atau penarikan peranan Admin hanya boleh dilakukan oleh
          pemilik projek di <strong>Firebase Console &gt; Cloud Firestore &gt; koleksi admins</strong>.
        </p>
      </div>

      {notice && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-sm ${
            notice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-2.5 pr-4 font-medium">Pengguna &amp; UID</th>
                <th className="py-2.5 pr-4 font-medium">Peranan</th>
                <th className="py-2.5 pr-4 font-medium">Kemajuan Topik</th>
                <th className="py-2.5 pr-4 font-medium">Kuiz &amp; Purata</th>
                <th className="py-2.5 pr-4 font-medium">Aktiviti Terakhir</th>
                <th className="py-2.5 text-right font-medium">Kawalan Akaun</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {rows.map((row) => (
                <tr key={row.profile.id}>
                  <td className="py-3 pr-4">
                    <p className="font-semibold text-slate-900">{row.profile.full_name}</p>
                    <p className="text-xs text-slate-500">
                      Kelas: {row.profile.class || row.profile.institution || '—'}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono-tabular">
                      UID: {row.profile.id}
                    </p>
                  </td>
                  <td className="py-3 pr-4 text-xs font-semibold">
                    <span
                      className={
                        row.profile.role === 'ADMIN'
                          ? 'text-amber-700'
                          : 'text-emerald-800'
                      }
                    >
                      {row.profile.role}
                    </span>
                    {!row.profile.is_active && (
                      <span className="ml-1.5 text-red-700">(Dinyahaktifkan)</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-xs text-slate-700">
                    {row.completedCount} / {topics.length} ({row.completionPercent}%)
                  </td>
                  <td className="py-3 pr-4 text-xs text-slate-700">
                    {row.attemptsCount} percubaan ·{' '}
                    <strong>
                      {row.avgScore !== null ? `${row.avgScore}%` : '—'}
                    </strong>
                  </td>
                  <td className="py-3 pr-4 text-xs text-slate-500">
                    {formatMalayDate(row.lastActivity)}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(row.profile)}
                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium ${
                        row.profile.is_active
                          ? 'border-slate-200 text-red-700 hover:bg-red-50'
                          : 'border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                      }`}
                    >
                      {row.profile.is_active ? (
                        <>
                          <UserX className="h-3.5 w-3.5" /> Sekat
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-3.5 w-3.5" /> Aktifkan
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
