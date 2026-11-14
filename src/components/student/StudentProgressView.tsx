import {CheckCircle2, Circle, ClipboardCheck, Clock} from 'lucide-react';
import {formatMalayDate} from '../../lib/youtube';
import type {
  ActivityLog,
  LearningModule,
  LearningProgress,
  Quiz,
  QuizAttempt,
  Topic,
} from '../../types/database';

interface StudentProgressViewProps {
  modules: LearningModule[];
  topics: Topic[];
  quizzes: Quiz[];
  progressMap: Record<string, LearningProgress>;
  attempts: QuizAttempt[];
  activityLogs: ActivityLog[];
  onSelectTopic: (moduleId: string, topicId: string) => void;
}

export function StudentProgressView({
  modules,
  topics,
  quizzes,
  progressMap,
  attempts,
  activityLogs,
  onSelectTopic,
}: StudentProgressViewProps) {
  const quizTitleMap = new Map(quizzes.map((q) => [q.id, q.title]));
  const completedTopics = topics.filter((t) => progressMap[t.id]?.is_completed);
  const pendingTopics = topics.filter((t) => !progressMap[t.id]?.is_completed);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Rekod Kemajuan Pembelajaran</h1>
        <p className="mt-1 text-sm text-slate-600">
          Pantau topik yang telah dipelajari, topik yang belum selesai, markah kuiz dan
          peratus pencapaian setiap modul.
        </p>
      </div>

      {/* Kemajuan Setiap Modul */}
      <section className="grid gap-4 md:grid-cols-2">
        {modules.map((mod) => {
          const modTopics = topics.filter((t) => t.module_id === mod.id);
          const modDone = modTopics.filter((t) => progressMap[t.id]?.is_completed).length;
          const pct =
            modTopics.length > 0 ? Math.round((modDone / modTopics.length) * 100) : 0;

          return (
            <div
              key={mod.id}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-base font-bold text-slate-900">{mod.title}</h2>
                <span className="text-lg font-bold text-emerald-800 tabular-nums">
                  {pct}%
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 tabular-nums">
                {modDone} daripada {modTopics.length} topik selesai
              </p>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-700"
                  style={{width: `${pct}%`}}
                />
              </div>
            </div>
          );
        })}
      </section>

      {/* Topik Selesai & Belum Selesai */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-bold text-slate-900">
            Topik Telah Dipelajari ({completedTopics.length})
          </h2>
          {completedTopics.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Belum ada topik ditandakan sebagai selesai.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {completedTopics.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => onSelectTopic(t.module_id, t.id)}
                    className="flex items-center gap-2.5 text-left text-sm font-medium text-slate-800 hover:text-emerald-800"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                    <span>{t.title}</span>
                  </button>
                  <span className="text-xs text-slate-400 shrink-0">
                    {formatMalayDate(progressMap[t.id]?.completed_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-bold text-slate-900">
            Topik Belum Selesai ({pendingTopics.length})
          </h2>
          {pendingTopics.length === 0 ? (
            <p className="mt-3 text-sm text-emerald-800 font-medium">
              Alhamdulillah! Semua topik diterbitkan telah anda selesaikan.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {pendingTopics.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => onSelectTopic(t.module_id, t.id)}
                    className="flex items-center gap-2.5 text-left text-sm font-medium text-slate-700 hover:text-emerald-800"
                  >
                    <Circle className="h-4 w-4 shrink-0 text-slate-300" />
                    <span>{t.title}</span>
                  </button>
                  <span className="text-xs font-medium text-emerald-700 shrink-0">
                    Buka Topik
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Markah Kuiz & Aktiviti Terakhir */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-900">
              Rekod Markah Kuiz ({attempts.length})
            </h2>
          </div>

          {attempts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Anda belum menjawab mana-mana kuiz lagi.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="py-2 pr-4 font-medium">Kuiz</th>
                    <th className="py-2 pr-4 font-medium">Markah</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 font-medium">Tarikh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {attempts.map((a) => (
                    <tr key={a.id}>
                      <td className="py-2.5 pr-4 font-medium text-slate-900">
                        {quizTitleMap.get(a.quiz_id) || 'Kuiz Pembelajaran'}
                      </td>
                      <td className="py-2.5 pr-4 font-semibold text-slate-900">
                        {a.score}%
                      </td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`text-xs font-semibold ${
                            a.passed ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {a.passed ? 'Lulus' : 'Cuba Lagi'}
                        </span>
                      </td>
                      <td className="py-2.5 text-xs text-slate-500">
                        {formatMalayDate(a.completed_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-700" />
            <h2 className="text-base font-bold text-slate-900">Log Aktiviti Terkini</h2>
          </div>

          {activityLogs.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Belum ada aktiviti direkodkan.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {activityLogs.slice(0, 8).map((log) => (
                <li
                  key={log.id}
                  className="border-b border-slate-100 pb-2.5 last:border-b-0 last:pb-0"
                >
                  <p className="text-sm text-slate-800">{log.description}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {formatMalayDate(log.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
