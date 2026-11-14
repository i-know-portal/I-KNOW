import React, {useEffect, useState} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import {useAuth} from '../../context/AuthContext';
import {
  deleteQuestion,
  deleteQuiz,
  fetchModules,
  fetchQuizzes,
  fetchQuizWithQuestions,
  fetchTopics,
  saveQuestionWithOptions,
  saveQuiz,
} from '../../services/learningService';
import type {
  LearningModule,
  PublishStatus,
  QuestionType,
  Quiz,
  QuizWithQuestions,
  Topic,
} from '../../types/database';

interface OptionDraft {
  option_text: string;
  match_target: string;
  is_correct: boolean;
}

export function AdminQuizManager() {
  const {user} = useAuth();
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizWithQuestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{type: 'success' | 'error'; text: string} | null>(
    null
  );

  // Borang Kuiz
  const [editingQuizId, setEditingQuizId] = useState<string | undefined>(undefined);
  const [quizModuleId, setQuizModuleId] = useState('');
  const [quizTopicId, setQuizTopicId] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDesc, setQuizDesc] = useState('');
  const [passingScore, setPassingScore] = useState(70);
  const [allowRetake, setAllowRetake] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState<string>('');
  const [quizStatus, setQuizStatus] = useState<PublishStatus>('Published');

  // Borang Soalan
  const [editingQuestionId, setEditingQuestionId] = useState<string | undefined>(undefined);
  const [qType, setQType] = useState<QuestionType>('objective');
  const [qPrompt, setQPrompt] = useState('');
  const [qArabic, setQArabic] = useState('');
  const [qExplanation, setQExplanation] = useState('');
  const [qPoints, setQPoints] = useState(10);
  const [optionsDraft, setOptionsDraft] = useState<OptionDraft[]>([
    {option_text: '', match_target: '', is_correct: true},
    {option_text: '', match_target: '', is_correct: false},
    {option_text: '', match_target: '', is_correct: false},
    {option_text: '', match_target: '', is_correct: false},
  ]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [mods, tops, qzs] = await Promise.all([
        fetchModules(true),
        fetchTopics(undefined, true),
        fetchQuizzes({includeDrafts: true}),
      ]);
      setModules(mods);
      setTopics(tops);
      setQuizzes(qzs);
      if (!quizModuleId && mods[0]) setQuizModuleId(mods[0].id);
      if (!selectedQuiz && qzs[0]) {
        const full = await fetchQuizWithQuestions(qzs[0].id, true);
        setSelectedQuiz(full);
      }
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memuatkan senarai kuiz.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const refreshSelectedQuiz = async (quizId: string) => {
    const full = await fetchQuizWithQuestions(quizId, true);
    setSelectedQuiz(full);
  };

  const resetQuizForm = () => {
    setEditingQuizId(undefined);
    setQuizTitle('');
    setQuizDesc('');
    setQuizTopicId('');
    setPassingScore(70);
    setAllowRetake(true);
    setMaxAttempts('');
    setQuizStatus('Published');
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    if (!quizModuleId) return;
    try {
      const saved = await saveQuiz({
        ...(editingQuizId ? {id: editingQuizId} : {}),
        module_id: quizModuleId,
        topic_id: quizTopicId || null,
        title: quizTitle.trim(),
        description: quizDesc.trim(),
        passing_score: Number(passingScore) || 70,
        allow_retake: allowRetake,
        max_attempts: maxAttempts ? Number(maxAttempts) : null,
        time_limit_minutes: null,
        status: quizStatus,
        created_by: user?.uid ?? null,
      });
      resetQuizForm();
      await loadAll();
      await refreshSelectedQuiz(saved.id);
      setNotice({type: 'success', text: `Kuiz "${saved.title}" berjaya disimpan.`});
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan kuiz.',
      });
    }
  };

  const handleDeleteQuiz = async (quiz: Quiz) => {
    await deleteQuiz(quiz.id);
    if (selectedQuiz?.id === quiz.id) setSelectedQuiz(null);
    await loadAll();
    setNotice({type: 'success', text: `Kuiz "${quiz.title}" dipadam.`});
  };

  const resetQuestionForm = () => {
    setEditingQuestionId(undefined);
    setQType('objective');
    setQPrompt('');
    setQArabic('');
    setQExplanation('');
    setQPoints(10);
    setOptionsDraft([
      {option_text: '', match_target: '', is_correct: true},
      {option_text: '', match_target: '', is_correct: false},
      {option_text: '', match_target: '', is_correct: false},
      {option_text: '', match_target: '', is_correct: false},
    ]);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuiz) return;
    setNotice(null);

    const cleanedOptions = optionsDraft
      .filter((o) => o.option_text.trim().length > 0)
      .map((o, idx) => ({
        option_text: o.option_text.trim(),
        match_target: qType === 'matching' ? o.match_target.trim() : null,
        is_correct: qType === 'matching' ? true : o.is_correct,
        sort_order: idx + 1,
      }));

    if (cleanedOptions.length < 2) {
      setNotice({
        type: 'error',
        text: 'Sila masukkan sekurang-kurangnya 2 pilihan jawapan atau padanan.',
      });
      return;
    }

    if (qType !== 'matching' && !cleanedOptions.some((o) => o.is_correct)) {
      setNotice({
        type: 'error',
        text: 'Sila tandakan sekurang-kurangnya satu jawapan yang betul.',
      });
      return;
    }

    try {
      await saveQuestionWithOptions({
        ...(editingQuestionId ? {id: editingQuestionId} : {}),
        quiz_id: selectedQuiz.id,
        quiz_status: selectedQuiz.status,
        question_type: qType,
        prompt: qPrompt.trim(),
        arabic_prompt: qArabic.trim() || null,
        explanation: qExplanation.trim(),
        points: Number(qPoints) || 10,
        sort_order: selectedQuiz.questions.length + 1,
        options: cleanedOptions,
      });
      resetQuestionForm();
      await refreshSelectedQuiz(selectedQuiz.id);
      setNotice({type: 'success', text: 'Soalan kuiz berjaya disimpan.'});
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan soalan.',
      });
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!selectedQuiz) return;
    await deleteQuestion(qId);
    await refreshSelectedQuiz(selectedQuiz.id);
  };

  const filteredTopics = topics.filter((t) => t.module_id === quizModuleId);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-16 text-sm text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
        Memuatkan pengurus kuiz...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pengurusan Kuiz &amp; Soalan</h1>
        <p className="mt-1 text-sm text-slate-600">
          Cipta kuiz objektif, padanan dan mengenal pasti hukum tajwid serta tetapkan
          kebenaran ulangan kuiz bagi pelajar.
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

      {/* Borang Cipta / Edit Kuiz */}
      <form
        onSubmit={handleSaveQuiz}
        className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            {editingQuizId ? 'Edit Kuiz' : 'Cipta Kuiz Baharu'}
          </h2>
          {editingQuizId && (
            <button
              type="button"
              onClick={resetQuizForm}
              className="text-xs text-slate-600 hover:text-slate-900"
            >
              Batal Edit
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-700">Modul</label>
            <select
              value={quizModuleId}
              onChange={(e) => {
                setQuizModuleId(e.target.value);
                setQuizTopicId('');
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Topik Berkaitan (Pilihan)
            </label>
            <select
              value={quizTopicId}
              onChange={(e) => setQuizTopicId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Umum Modul</option>
              {filteredTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Status</label>
            <select
              value={quizStatus}
              onChange={(e) => setQuizStatus(e.target.value as PublishStatus)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">Tajuk Kuiz</label>
            <input
              type="text"
              required
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              placeholder="Contoh: Kuiz Wuduk dan Rukun Solat"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Markah Lulus (%)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={passingScore}
              onChange={(e) => setPassingScore(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">Penerangan</label>
          <input
            type="text"
            value={quizDesc}
            onChange={(e) => setQuizDesc(e.target.value)}
            placeholder="Arahan ringkas kepada pelajar"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-6">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={allowRetake}
                onChange={(e) => setAllowRetake(e.target.checked)}
                className="h-4 w-4 accent-emerald-700"
              />
              Benarkan Pelajar Mengulang Kuiz
            </label>

            {allowRetake && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600">Had Percubaan (kosong = tanpa had):</label>
                <input
                  type="number"
                  min={1}
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(e.target.value)}
                  className="w-20 rounded-lg border border-slate-300 px-2.5 py-1 text-xs"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            {editingQuizId ? 'Kemas Kini Kuiz' : 'Simpan Kuiz Baharu'}
          </button>
        </div>
      </form>

      {/* Senarai Kuiz & Editor Soalan */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="text-base font-bold text-slate-900">
            Senarai Kuiz ({quizzes.length})
          </h2>
          <div className="space-y-2">
            {quizzes.map((qz) => {
              const active = selectedQuiz?.id === qz.id;
              return (
                <div
                  key={qz.id}
                  className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${
                    active
                      ? 'border-emerald-700 bg-emerald-50/50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => refreshSelectedQuiz(qz.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {qz.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {qz.status} · Lulus {qz.passing_score}% ·{' '}
                      {qz.allow_retake ? 'Boleh Ulang' : 'Sekali Sahaja'}
                    </p>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingQuizId(qz.id);
                        setQuizModuleId(qz.module_id);
                        setQuizTopicId(qz.topic_id || '');
                        setQuizTitle(qz.title);
                        setQuizDesc(qz.description);
                        setPassingScore(qz.passing_score);
                        setAllowRetake(qz.allow_retake);
                        setMaxAttempts(qz.max_attempts ? String(qz.max_attempts) : '');
                        setQuizStatus(qz.status);
                      }}
                      className="rounded p-1.5 text-slate-500 hover:text-emerald-800"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuiz(qz)}
                      className="rounded p-1.5 text-slate-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="lg:col-span-7 space-y-5">
          {!selectedQuiz ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              Pilih satu kuiz di sebelah kiri untuk mengurus soalan.
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
              <div>
                <p className="text-xs font-semibold text-emerald-800">
                  Soalan bagi: {selectedQuiz.title}
                </p>
                <h3 className="mt-1 text-base font-bold text-slate-900">
                  {editingQuestionId ? 'Edit Soalan' : 'Tambah Soalan Baharu'}
                </h3>
              </div>

              <form
                onSubmit={handleSaveQuestion}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3"
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700">
                      Jenis Soalan
                    </label>
                    <select
                      value={qType}
                      onChange={(e) => setQType(e.target.value as QuestionType)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium"
                    >
                      <option value="objective">Soalan Objektif (Aneka Pilihan)</option>
                      <option value="tajwid_identification">
                        Mengenal Pasti Hukum Tajwid
                      </option>
                      <option value="matching">Soalan Padanan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Markah</label>
                    <input
                      type="number"
                      min={1}
                      value={qPoints}
                      onChange={(e) => setQPoints(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <input
                  type="text"
                  required
                  value={qPrompt}
                  onChange={(e) => setQPrompt(e.target.value)}
                  placeholder="Teks soalan..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />

                <input
                  type="text"
                  value={qArabic}
                  onChange={(e) => setQArabic(e.target.value)}
                  placeholder="Potongan ayat al-Quran / lafaz Arab (pilihan)"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-right font-arabic"
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">
                      {qType === 'matching'
                        ? 'Pasangan Padanan (Item Kiri -> Padanan Kanan)'
                        : 'Pilihan Jawapan (tandakan jawapan betul)'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setOptionsDraft((prev) => [
                          ...prev,
                          {option_text: '', match_target: '', is_correct: false},
                        ])
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"
                    >
                      <Plus className="h-3.5 w-3.5" /> Baris
                    </button>
                  </div>

                  {optionsDraft.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {qType !== 'matching' && (
                        <input
                          type="radio"
                          name="correct-option"
                          checked={opt.is_correct}
                          onChange={() =>
                            setOptionsDraft((prev) =>
                              prev.map((item, idx) => ({
                                ...item,
                                is_correct: idx === i,
                              }))
                            )
                          }
                          title="Tandakan sebagai jawapan betul"
                          className="h-4 w-4 accent-emerald-700"
                        />
                      )}
                      <input
                        type="text"
                        value={opt.option_text}
                        onChange={(e) =>
                          setOptionsDraft((prev) =>
                            prev.map((item, idx) =>
                              idx === i ? {...item, option_text: e.target.value} : item
                            )
                          )
                        }
                        placeholder={
                          qType === 'matching' ? `Item ${i + 1}` : `Pilihan ${i + 1}`
                        }
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                      />
                      {qType === 'matching' && (
                        <input
                          type="text"
                          value={opt.match_target}
                          onChange={(e) =>
                            setOptionsDraft((prev) =>
                              prev.map((item, idx) =>
                                idx === i ? {...item, match_target: e.target.value} : item
                              )
                            )
                          }
                          placeholder={`Padanan ${i + 1}`}
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <input
                  type="text"
                  value={qExplanation}
                  onChange={(e) => setQExplanation(e.target.value)}
                  placeholder="Maklum balas / penjelasan jawapan selepas pelajar menghantar kuiz"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                />

                <div className="flex justify-end gap-2">
                  {editingQuestionId && (
                    <button
                      type="button"
                      onClick={resetQuestionForm}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                    >
                      Batal Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    {editingQuestionId ? 'Kemas Kini Soalan' : 'Simpan Soalan'}
                  </button>
                </div>
              </form>

              {/* Senarai Soalan Sedia Ada */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Senarai Soalan ({selectedQuiz.questions.length})
                </h4>
                {selectedQuiz.questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3.5"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-amber-700">
                        Soalan {idx + 1} · {q.question_type} · {q.points} markah
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-900">
                        {q.prompt}
                      </p>
                      {q.arabic_prompt && (
                        <p className="mt-1 text-xl font-arabic text-slate-800">
                          {q.arabic_prompt}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQuestionId(q.id);
                          setQType(q.question_type);
                          setQPrompt(q.prompt);
                          setQArabic(q.arabic_prompt || '');
                          setQExplanation(q.explanation || '');
                          setQPoints(q.points);
                          setOptionsDraft(
                            (q.quiz_options ?? []).map((o) => ({
                              option_text: o.option_text,
                              match_target: o.match_target || '',
                              is_correct: o.is_correct,
                            }))
                          );
                        }}
                        className="rounded p-1.5 text-slate-500 hover:text-emerald-800"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="rounded p-1.5 text-slate-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
