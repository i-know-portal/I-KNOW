import {ClipboardCheck, Play, RotateCcw} from 'lucide-react';
import {formatMalayDate} from '../../lib/youtube';
import type {LearningModule, Quiz, QuizAttempt} from '../../types/database';

interface QuizzesHubProps {
  modules: LearningModule[];
  quizzes: Quiz[];
  attempts: QuizAttempt[];
  onStartQuiz: (quizId: string) => void;
}

export function QuizzesHub({
  modules,
  quizzes,
  attempts,
  onStartQuiz,
}: QuizzesHubProps) {
  const moduleMap = new Map(modules.map((m) => [m.id, m.title]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Kuiz Interaktif</h1>
        <p className="mt-1 text-sm text-slate-600">
          Uji penguasaan anda melalui soalan objektif, padanan dan mengenal pasti hukum
          tajwid dengan pemarkahan automatik.
        </p>
      </div>

      {quizzes.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Tiada kuiz diterbitkan buat masa ini.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {quizzes.map((quiz) => {
            const quizAttempts = attempts.filter((a) => a.quiz_id === quiz.id);
            const bestScore =
              quizAttempts.length > 0
                ? Math.max(...quizAttempts.map((a) => Number(a.score)))
                : null;
            const latest = quizAttempts[0];
            const retakeBlocked =
              quizAttempts.length > 0 &&
              (!quiz.allow_retake ||
                (quiz.max_attempts !== null &&
                  quizAttempts.length >= quiz.max_attempts));

            return (
              <article
                key={quiz.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div>
                  <p className="text-xs font-medium text-emerald-800">
                    {moduleMap.get(quiz.module_id) || 'Modul Pembelajaran'}
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">{quiz.title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {quiz.description}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 tabular-nums">
                    <span>Markah Lulus: {quiz.passing_score}%</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {quiz.allow_retake ? 'Boleh Diulang' : '1 Percubaan Sahaja'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Percubaan Anda: {quizAttempts.length}</span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <div className="text-xs text-slate-600 tabular-nums">
                    {bestScore !== null ? (
                      <span>
                        Markah Terbaik: <strong className="text-emerald-800">{bestScore}%</strong>
                        {latest ? ` · Terakhir ${formatMalayDate(latest.completed_at)}` : ''}
                      </span>
                    ) : (
                      <span>Belum pernah dijawab</span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={retakeBlocked}
                    onClick={() => onStartQuiz(quiz.id)}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                      retakeBlocked
                        ? 'border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-700 text-white hover:bg-emerald-800'
                    }`}
                  >
                    {quizAttempts.length > 0 ? (
                      <>
                        {retakeBlocked ? (
                          <ClipboardCheck className="h-3.5 w-3.5" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        {retakeBlocked ? 'Telah Dijawab' : 'Ulang Kuiz'}
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" />
                        Mula Kuiz
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
