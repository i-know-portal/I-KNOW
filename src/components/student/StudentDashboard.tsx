import {ArrowRight, Award, BookOpen, CheckCircle2, Clock, Compass} from 'lucide-react';
import {PORTAL_MEDIA} from '../../assets/media';
import {useAuth} from '../../context/AuthContext';
import {formatMalayDate} from '../../lib/youtube';
import type {
  ActivityLog,
  LearningModule,
  LearningProgress,
  Quiz,
  QuizAttempt,
  Topic,
} from '../../types/database';

interface StudentDashboardProps {
  modules: LearningModule[];
  topics: Topic[];
  quizzes: Quiz[];
  progressMap: Record<string, LearningProgress>;
  attempts: QuizAttempt[];
  activityLogs: ActivityLog[];
  onOpenModules: () => void;
  onSelectTopic: (moduleId: string, topicId: string) => void;
  onStartQuiz: (quizId: string) => void;
}

export function StudentDashboard({
  modules,
  topics,
  quizzes,
  progressMap,
  attempts,
  activityLogs,
  onOpenModules,
  onSelectTopic,
  onStartQuiz,
}: StudentDashboardProps) {
  const {profile} = useAuth();

  const completedCount = topics.filter((t) => progressMap[t.id]?.is_completed).length;
  const overallPercent =
    topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0;

  const avgQuizScore =
    attempts.length > 0
      ? Math.round(
          attempts.reduce((sum, a) => sum + Number(a.score), 0) / attempts.length
        )
      : null;

  const lastActivityDate =
    activityLogs[0]?.created_at || attempts[0]?.completed_at || null;

  const nextRecommendedTopic =
    topics.find((t) => !progressMap[t.id]?.is_completed) ?? topics[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Banner Selamat Datang */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white grid lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold tracking-wider text-amber-700 uppercase">
              ILMU • AMALAN • PENGHAYATAN
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Assalamualaikum, {profile?.full_name || 'Pelajar'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Teruskan perjalanan pembelajaran ilmu Islam anda secara kendiri melalui
              Modul Solat dan Modul Tajwid yang sistematik serta kuiz penilaian kendiri.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {nextRecommendedTopic && (
              <button
                type="button"
                onClick={() =>
                  onSelectTopic(nextRecommendedTopic.module_id, nextRecommendedTopic.id)
                }
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Sambung Topik: {nextRecommendedTopic.title}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onOpenModules}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Lihat Semua Modul
            </button>
          </div>
        </div>

        <div className="lg:col-span-4 relative min-h-48 bg-emerald-950">
          <img
            src={PORTAL_MEDIA.heroPortal}
            alt="Suasana pusat pembelajaran I-KNOW"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        </div>
      </section>

      {/* Kad Statistik Kemajuan Pelajar */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Kemajuan Keseluruhan</span>
            <BookOpen className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {overallPercent}%
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {completedCount} daripada {topics.length} topik selesai
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Kuiz Diselesaikan</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {attempts.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {quizzes.length} kuiz diterbitkan tersedia
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Purata Markah Kuiz</span>
            <Award className="h-4 w-4 text-amber-700" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {avgQuizScore !== null ? `${avgQuizScore}%` : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {avgQuizScore !== null ? 'Berdasarkan semua percubaan' : 'Belum ada percubaan'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Aktiviti Terakhir</span>
            <Clock className="h-4 w-4 text-slate-500" />
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {formatMalayDate(lastActivityDate)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Rekod pembelajaran kendiri</p>
        </div>
      </section>

      {/* Ringkasan Modul & Kuiz */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-7 space-y-4">
          <h2 className="text-base font-bold text-slate-900">Modul Pembelajaran Aktif</h2>
          {modules.map((mod) => {
            const modTopics = topics.filter((t) => t.module_id === mod.id);
            const done = modTopics.filter((t) => progressMap[t.id]?.is_completed).length;
            const pct =
              modTopics.length > 0 ? Math.round((done / modTopics.length) * 100) : 0;
            const firstPending =
              modTopics.find((t) => !progressMap[t.id]?.is_completed) ?? modTopics[0];
            const isSolat = mod.code === 'MOD-SOLAT' || mod.slug.includes('solat');

            return (
              <div
                key={mod.id}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {isSolat ? (
                      <Compass className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                    ) : (
                      <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                    )}
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{mod.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        {mod.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-emerald-800 tabular-nums">
                    {pct}%
                  </span>
                </div>

                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-700"
                    style={{width: `${pct}%`}}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span className="tabular-nums">
                    {done} / {modTopics.length} topik selesai
                  </span>
                  {firstPending && (
                    <button
                      type="button"
                      onClick={() => onSelectTopic(mod.id, firstPending.id)}
                      className="font-semibold text-emerald-700 hover:text-emerald-900"
                    >
                      Buka Topik →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        <section className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-bold text-slate-900">Kuiz Tersedia</h2>
          <p className="mt-1 text-xs text-slate-500">
            Uji kefahaman anda selepas meneliti nota dan bahan pembelajaran.
          </p>

          <div className="mt-4 space-y-3">
            {quizzes.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada kuiz diterbitkan.</p>
            ) : (
              quizzes.slice(0, 4).map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {q.title}
                    </p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      Markah lulus: {q.passing_score}%
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onStartQuiz(q.id)}
                    className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
                  >
                    Jawab
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
