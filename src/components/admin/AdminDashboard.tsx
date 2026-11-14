import {useEffect, useState} from 'react';
import {
  Activity,
  Award,
  BookOpen,
  FileText,
  Loader2,
  Users,
} from 'lucide-react';
import {formatMalayDate} from '../../lib/youtube';
import {fetchAdminDashboardOverview} from '../../services/learningService';
import type {
  ActivityLog,
  LearningModule,
  LearningProgress,
  Material,
  Profile,
  Quiz,
  QuizAttempt,
  Topic,
} from '../../types/database';
import type {NavRoute} from '../layout/AppShell';

export function AdminDashboard({onNavigate}: {onNavigate: (route: NavRoute) => void}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    profiles: Profile[];
    modules: LearningModule[];
    topics: Topic[];
    materials: Material[];
    quizzes: Quiz[];
    attempts: QuizAttempt[];
    progress: LearningProgress[];
    recentLogs: ActivityLog[];
  } | null>(null);

  useEffect(() => {
    fetchAdminDashboardOverview()
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Gagal memuatkan data pentadbir.')
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-16 text-sm text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
        Memuatkan statistik keseluruhan I-KNOW...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        {error || 'Ralat tidak dijangka berlaku.'}
      </div>
    );
  }

  const students = data.profiles.filter((p) => p.role === 'PELAJAR');
  const publishedTopics = data.topics.filter((t) => t.status === 'Published');
  const publishedMaterials = data.materials.filter((m) => m.status === 'Published');
  const avgScore =
    data.attempts.length > 0
      ? Math.round(
          data.attempts.reduce((sum, a) => sum + Number(a.score), 0) /
            data.attempts.length
        )
      : null;

  const profileMap = new Map(data.profiles.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-amber-700 uppercase">
            PANEL PENTADBIRAN I-KNOW
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Dashboard Pentadbir &amp; Prestasi Keseluruhan
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('admin-curriculum')}
            className="rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            Urus Modul &amp; Topik
          </button>
          <button
            type="button"
            onClick={() => onNavigate('admin-materials')}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Muat Naik Bahan
          </button>
        </div>
      </div>

      {/* Kad Statistik */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Jumlah Pelajar</span>
            <Users className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {students.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {students.filter((s) => s.is_active).length} akaun aktif
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Modul &amp; Topik</span>
            <BookOpen className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {publishedTopics.length} / {data.topics.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Topik diterbitkan dalam {data.modules.length} modul
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Bahan Pembelajaran</span>
            <FileText className="h-4 w-4 text-amber-700" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {data.materials.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {publishedMaterials.length} diterbitkan ·{' '}
            {data.materials.length - publishedMaterials.length} draf
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Purata Skor Kuiz</span>
            <Award className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {avgScore !== null ? `${avgScore}%` : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {data.attempts.length} jumlah percubaan pelajar
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Ringkasan Modul */}
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-bold text-slate-900">
            Status Kurikulum Mengikut Modul
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2 pr-4 font-medium">Modul</th>
                  <th className="py-2 pr-4 font-medium">Topik</th>
                  <th className="py-2 pr-4 font-medium">Bahan</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {data.modules.map((mod) => {
                  const modTopics = data.topics.filter((t) => t.module_id === mod.id);
                  const modMats = data.materials.filter((m) => m.module_id === mod.id);
                  return (
                    <tr key={mod.id}>
                      <td className="py-3 pr-4 font-semibold text-slate-900">
                        {mod.title}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{modTopics.length}</td>
                      <td className="py-3 pr-4 text-slate-600">{modMats.length}</td>
                      <td className="py-3">
                        <span
                          className={`text-xs font-semibold ${
                            mod.status === 'Published'
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {mod.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Aktiviti Pelajar Terkini */}
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">
              Aktiviti Pembelajaran Terkini
            </h2>
          </div>

          {data.recentLogs.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Belum ada aktiviti pelajar direkodkan.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {data.recentLogs.slice(0, 8).map((log) => {
                const student = profileMap.get(log.user_id);
                return (
                  <li key={log.id} className="py-2.5">
                    <p className="text-sm text-slate-800">
                      <span className="font-semibold">
                        {student?.full_name || 'Pelajar'}:
                      </span>{' '}
                      {log.description}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatMalayDate(log.created_at)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
