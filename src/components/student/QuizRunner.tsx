import {useEffect, useMemo, useState} from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import {useAuth} from '../../context/AuthContext';
import {formatMalayDate} from '../../lib/youtube';
import {
  fetchQuizWithQuestions,
  fetchStudentQuizAttempts,
  type GradedQuizResult,
  submitQuizAttempt,
} from '../../services/learningService';
import type {QuizAttempt, QuizWithQuestions} from '../../types/database';

interface QuizRunnerProps {
  quizId: string;
  onBack: () => void;
  onCompleted?: () => void;
}

export function QuizRunner({quizId, onBack, onCompleted}: QuizRunnerProps) {
  const {user} = useAuth();
  const [quiz, setQuiz] = useState<QuizWithQuestions | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [startedAt, setStartedAt] = useState<string>(new Date().toISOString());
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [matchingAnswers, setMatchingAnswers] = useState<
    Record<string, Record<string, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [gradedResult, setGradedResult] = useState<GradedQuizResult | null>(null);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [quizData, attemptHistory] = await Promise.all([
        fetchQuizWithQuestions(quizId),
        fetchStudentQuizAttempts(user.uid, quizId),
      ]);
      setQuiz(quizData);
      setAttempts(attemptHistory);
      setStartedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuatkan kuiz.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [quizId, user?.uid]);

  const canTakeQuiz = useMemo(() => {
    if (!quiz) return false;
    if (attempts.length === 0) return true;
    if (!quiz.allow_retake) return false;
    if (quiz.max_attempts && attempts.length >= quiz.max_attempts) return false;
    return true;
  }, [quiz, attempts]);

  const handleRestart = () => {
    setSelectedOptions({});
    setMatchingAnswers({});
    setGradedResult(null);
    setStartedAt(new Date().toISOString());
  };

  const handleSubmit = async () => {
    if (!quiz || !user) return;

    // Validate all questions have an answer
    for (const q of quiz.questions) {
      if (q.question_type === 'matching') {
        const opts = q.quiz_options ?? [];
        const chosen = matchingAnswers[q.id] ?? {};
        const missing = opts.some((o) => !chosen[o.id]);
        if (missing) {
          setError('Sila lengkapkan semua padanan sebelum menghantar kuiz.');
          return;
        }
      } else if (!selectedOptions[q.id]) {
        setError('Sila jawab semua soalan sebelum menghantar kuiz.');
        return;
      }
    }

    setError(null);
    setSubmitting(true);
    try {
      const result = await submitQuizAttempt({
        quiz,
        studentId: user.uid,
        startedAt,
        selectedOptionByQuestion: selectedOptions,
        matchingByQuestion: matchingAnswers,
      });
      setGradedResult(result);
      setAttempts((prev) => [result.attempt, ...prev]);
      onCompleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghantar jawapan kuiz.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-16 text-sm text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
        Memuatkan soalan kuiz...
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Kuiz tidak ditemui atau belum diterbitkan.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>

        <div className="text-xs text-slate-500 font-mono-tabular">
          Markah Lulus: {quiz.passing_score}% · Percubaan: {attempts.length}
          {quiz.max_attempts ? ` / ${quiz.max_attempts}` : ''}
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-start gap-3">
          <ClipboardCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">{quiz.title}</h1>
            <p className="mt-1 text-sm text-slate-600">{quiz.description}</p>
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Paparan Keputusan Selepas Hantar */}
      {gradedResult && (
        <section className="space-y-6">
          <div
            className={`rounded-2xl border p-6 ${
              gradedResult.attempt.passed
                ? 'border-emerald-200 bg-emerald-50/70'
                : 'border-amber-200 bg-amber-50/70'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Keputusan Kuiz
                </p>
                <h2 className="mt-1 text-3xl font-bold text-slate-900 tabular-nums">
                  {gradedResult.attempt.score}%{' '}
                  <span className="text-base font-medium text-slate-600">
                    ({gradedResult.attempt.earned_points} /{' '}
                    {gradedResult.attempt.total_points} markah)
                  </span>
                </h2>
                <p className="mt-1 text-sm font-semibold text-emerald-900">
                  {gradedResult.attempt.passed
                    ? 'Tahniah! Anda telah melepasi markah lulus.'
                    : 'Belum mencapai markah lulus. Sila semak maklum balas di bawah.'}
                </p>
              </div>

              {canTakeQuiz && (
                <button
                  type="button"
                  onClick={handleRestart}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  <RotateCcw className="h-4 w-4" />
                  Ulang Kuiz
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              Semakan &amp; Maklum Balas Jawapan
            </h3>
            {gradedResult.questionResults.map((qr, idx) => (
              <div
                key={qr.question.id}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {idx + 1}. {qr.question.prompt}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold shrink-0 ${
                      qr.isCorrect ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {qr.isCorrect ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Betul ({qr.pointsEarned}m)
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" /> Salah (0m)
                      </>
                    )}
                  </span>
                </div>

                {qr.question.arabic_prompt && (
                  <p className="mt-3 rounded-lg bg-slate-50 px-4 py-3 text-center text-2xl font-arabic text-slate-900">
                    {qr.question.arabic_prompt}
                  </p>
                )}

                {qr.question.explanation && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
                    <strong>Penjelasan:</strong> {qr.question.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Borang Soalan Interaktif */}
      {!gradedResult && canTakeQuiz && (
        <div className="space-y-5">
          {quiz.questions.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
              Tiada soalan ditambah pada kuiz ini lagi.
            </div>
          ) : (
            <>
              {quiz.questions.map((question, idx) => {
                const options = question.quiz_options ?? [];
                const targetPool =
                  question.question_type === 'matching'
                    ? Array.from(
                        new Set(
                          options
                            .map((o) => o.match_target || '')
                            .filter(Boolean)
                        )
                      ).sort()
                    : [];

                return (
                  <section
                    key={question.id}
                    className="rounded-2xl border border-slate-200 bg-white p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          Soalan {idx + 1} ·{' '}
                          {question.question_type === 'matching'
                            ? 'Padanan'
                            : question.question_type === 'tajwid_identification'
                              ? 'Kenal Pasti Hukum Tajwid'
                              : 'Objektif'}
                        </p>
                        <h3 className="mt-1 text-base font-semibold text-slate-900">
                          {question.prompt}
                        </h3>
                      </div>
                      <span className="text-xs font-medium text-slate-500 tabular-nums shrink-0">
                        {question.points} markah
                      </span>
                    </div>

                    {question.arabic_prompt && (
                      <div className="mt-4 rounded-xl border border-amber-200/70 bg-amber-50/40 px-4 py-4 text-center">
                        <p className="text-3xl font-arabic text-slate-900">
                          {question.arabic_prompt}
                        </p>
                      </div>
                    )}

                    {question.question_type === 'matching' ? (
                      <div className="mt-5 space-y-3">
                        {options.map((opt) => (
                          <div
                            key={opt.id}
                            className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 sm:grid-cols-2 sm:items-center"
                          >
                            <span className="text-sm font-medium text-slate-900">
                              {opt.option_text}
                            </span>
                            <select
                              value={matchingAnswers[question.id]?.[opt.id] || ''}
                              onChange={(e) =>
                                setMatchingAnswers((prev) => ({
                                  ...prev,
                                  [question.id]: {
                                    ...(prev[question.id] ?? {}),
                                    [opt.id]: e.target.value,
                                  },
                                }))
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                            >
                              <option value="">-- Pilih padanan tepat --</option>
                              {targetPool.map((target) => (
                                <option key={target} value={target}>
                                  {target}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-5 grid gap-2.5">
                        {options.map((opt) => {
                          const isSelected = selectedOptions[question.id] === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                setSelectedOptions((prev) => ({
                                  ...prev,
                                  [question.id]: opt.id,
                                }))
                              }
                              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                                isSelected
                                  ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-semibold'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span>{opt.option_text}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  {submitting ? 'Menyemak jawapan...' : 'Hantar Jawapan Kuiz'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {!gradedResult && !canTakeQuiz && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
          Anda telah melengkapkan percubaan yang dibenarkan bagi kuiz ini. Ulangan
          kuiz ditetapkan sebagai tidak dibenarkan oleh Admin.
        </div>
      )}

      {/* Sejarah Percubaan */}
      {attempts.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-slate-900">
            Rekod Percubaan Anda ({attempts.length})
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2 pr-4 font-medium">Tarikh</th>
                  <th className="py-2 pr-4 font-medium">Markah</th>
                  <th className="py-2 pr-4 font-medium">Mata</th>
                  <th className="py-2 font-medium">Keputusan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {attempts.map((att) => (
                  <tr key={att.id}>
                    <td className="py-2.5 pr-4 text-xs text-slate-600">
                      {formatMalayDate(att.completed_at)}
                    </td>
                    <td className="py-2.5 pr-4 font-semibold text-slate-900">
                      {att.score}%
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600">
                      {att.earned_points} / {att.total_points}
                    </td>
                    <td className="py-2.5 font-medium">
                      {att.passed ? (
                        <span className="text-emerald-700">Lulus</span>
                      ) : (
                        <span className="text-amber-700">Belum Lulus</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
