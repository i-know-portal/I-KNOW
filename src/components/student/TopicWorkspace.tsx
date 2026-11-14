import {useEffect, useState} from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {useAuth} from '../../context/AuthContext';
import {
  fetchContentBlocks,
  fetchMaterials,
  fetchQuizzes,
  fetchSubtopics,
  recordTopicProgress,
} from '../../services/learningService';
import type {
  ContentBlock,
  LearningModule,
  LearningProgress,
  Material,
  Quiz,
  Subtopic,
  Topic,
} from '../../types/database';
import {InlineMaterialViewer} from './InlineMaterialViewer';

interface TopicWorkspaceProps {
  module: LearningModule;
  topics: Topic[];
  initialTopicId: string;
  progressMap: Record<string, LearningProgress>;
  onProgressUpdated: () => void;
  onStartQuiz: (quizId: string) => void;
  onBack: () => void;
}

export function TopicWorkspace({
  module,
  topics,
  initialTopicId,
  progressMap,
  onProgressUpdated,
  onStartQuiz,
  onBack,
}: TopicWorkspaceProps) {
  const {user} = useAuth();
  const [selectedTopicId, setSelectedTopicId] = useState(initialTopicId);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCompletion, setSavingCompletion] = useState(false);

  const currentTopic = topics.find((t) => t.id === selectedTopicId) ?? topics[0];
  const currentProgress = currentTopic ? progressMap[currentTopic.id] : undefined;
  const isCompleted = Boolean(currentProgress?.is_completed);

  useEffect(() => {
    if (!currentTopic) return;
    let active = true;
    setLoading(true);

    Promise.all([
      fetchSubtopics(currentTopic.id, false),
      fetchContentBlocks(currentTopic.id, false),
      fetchMaterials({topicId: currentTopic.id, includeDrafts: false}),
      fetchQuizzes({topicId: currentTopic.id, includeDrafts: false}),
    ])
      .then(([subs, blks, mats, qzs]) => {
        if (!active) return;
        setSubtopics(subs);
        setBlocks(blks);
        setMaterials(mats);
        setQuizzes(qzs);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currentTopic?.id]);

  const handleToggleCompleted = async () => {
    if (!user || !currentTopic) return;
    setSavingCompletion(true);
    try {
      await recordTopicProgress({
        studentId: user.uid,
        moduleId: module.id,
        topicId: currentTopic.id,
        topicTitle: currentTopic.title,
        isCompleted: !isCompleted,
      });
      onProgressUpdated();
    } finally {
      setSavingCompletion(false);
    }
  };

  if (!currentTopic) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
        Tiada topik diterbitkan dalam modul ini buat masa ini.
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
          Senarai Modul
        </button>

        <button
          type="button"
          disabled={savingCompletion}
          onClick={handleToggleCompleted}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            isCompleted
              ? 'border border-emerald-700 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
              : 'bg-emerald-700 text-white hover:bg-emerald-800'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          {savingCompletion
            ? 'Menyimpan...'
            : isCompleted
              ? 'Topik Telah Selesai'
              : 'Tandakan Topik Selesai'}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Senarai Topik Modul */}
        <aside className="lg:col-span-4 space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold text-emerald-800">{module.title}</p>
            <h2 className="mt-1 text-base font-bold text-slate-900">
              Senarai Topik ({topics.length})
            </h2>
            <div className="mt-4 space-y-1.5">
              {topics.map((topic) => {
                const done = Boolean(progressMap[topic.id]?.is_completed);
                const selected = topic.id === currentTopic.id;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setSelectedTopicId(topic.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors ${
                      selected
                        ? 'bg-emerald-700 text-white font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">{topic.title}</span>
                    {done && (
                      <CheckCircle2
                        className={`h-4 w-4 shrink-0 ${
                          selected ? 'text-amber-300' : 'text-emerald-600'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Kandungan Topik */}
        <div className="lg:col-span-8 space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>{module.title}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Anggaran {currentTopic.estimated_minutes} minit
              </span>
              <span aria-hidden="true">·</span>
              <span>{isCompleted ? 'Status: Selesai' : 'Status: Belum Selesai'}</span>
            </div>

            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              {currentTopic.title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {currentTopic.description}
            </p>

            {currentTopic.learning_objectives.length > 0 && (
              <div className="mt-5 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-900">
                  Objektif Pembelajaran
                </h2>
                <ul className="mt-2.5 space-y-1.5 text-sm text-slate-800">
                  {currentTopic.learning_objectives.map((obj, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-mono-tabular text-xs font-semibold text-emerald-700 mt-0.5">
                        0{idx + 1}.
                      </span>
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-14 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
              Memuatkan nota, subtopik dan bahan pembelajaran...
            </div>
          ) : (
            <>
              {/* Subtopik */}
              {subtopics.length > 0 && (
                <section className="rounded-2xl border border-slate-200 bg-white p-6">
                  <h2 className="text-base font-bold text-slate-900">
                    Subtopik Terkandung
                  </h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {subtopics.map((sub, i) => (
                      <div
                        key={sub.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                      >
                        <p className="text-xs font-semibold text-emerald-800">
                          Subtopik {i + 1}
                        </p>
                        <h3 className="mt-0.5 text-sm font-semibold text-slate-900">
                          {sub.title}
                        </h3>
                        {sub.summary && (
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">
                            {sub.summary}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Blok Nota, Bacaan Solat, Contoh Tajwid & Aktiviti */}
              {blocks.length > 0 && (
                <section className="space-y-4">
                  <h2 className="text-base font-bold text-slate-900">
                    Nota &amp; Aktiviti Pembelajaran
                  </h2>
                  {blocks.map((block) => (
                    <article
                      key={block.id}
                      className="rounded-2xl border border-slate-200 bg-white p-6"
                    >
                      <p className="text-xs font-semibold text-amber-700">
                        {block.block_type === 'prayer_recitation'
                          ? 'Bacaan dalam Solat'
                          : block.block_type === 'quran_tajwid'
                            ? 'Contoh Ayat & Hukum Tajwid'
                            : block.block_type === 'activity'
                              ? 'Aktiviti Pembelajaran'
                              : 'Nota Pembelajaran'}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">
                        {block.title}
                      </h3>

                      {block.arabic_text && (
                        <div className="mt-4 rounded-xl border border-amber-200/70 bg-amber-50/40 px-5 py-4 text-center">
                          <p className="text-3xl font-arabic text-slate-900">
                            {block.arabic_text}
                          </p>
                          {block.transliteration && (
                            <p className="mt-2 text-sm italic text-emerald-900">
                              {block.transliteration}
                            </p>
                          )}
                          {block.translation && (
                            <p className="mt-1 text-xs text-slate-600">
                              Maksud: {block.translation}
                            </p>
                          )}
                        </div>
                      )}

                      {block.body && (
                        <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                          {block.body}
                        </div>
                      )}
                    </article>
                  ))}
                </section>
              )}

              {/* Bahan Pembelajaran (PDF, Imej, Audio, Video, YouTube) */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">
                    Bahan Pembelajaran Diterbitkan ({materials.length})
                  </h2>
                </div>
                {materials.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                    Tiada bahan multimedia tambahan diterbitkan bagi topik ini buat masa ini.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {materials.map((mat) => (
                      <InlineMaterialViewer key={mat.id} material={mat} />
                    ))}
                  </div>
                )}
              </section>

              {/* Kuiz Topik */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2.5">
                  <ClipboardCheck className="h-5 w-5 text-emerald-700" />
                  <h2 className="text-base font-bold text-slate-900">
                    Penilaian &amp; Kuiz Topik ({quizzes.length})
                  </h2>
                </div>

                {quizzes.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">
                    Belum ada kuiz khusus dipautkan pada topik ini. Anda juga boleh
                    mengakses semua kuiz di menu Kuiz Interaktif.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {quizzes.map((q) => (
                      <div
                        key={q.id}
                        className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                      >
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            {q.title}
                          </h3>
                          <p className="mt-1 text-xs text-slate-600">{q.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onStartQuiz(q.id)}
                          className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Mula Jawab Kuiz
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {subtopics.length === 0 && blocks.length === 0 && materials.length === 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <BookOpen className="h-4 w-4 text-emerald-700" />
                    Ringkasan Topik
                  </div>
                  <p className="mt-2">
                    Sila semak objektif pembelajaran di atas. Nota tambahan dan bahan
                    pembelajaran sedang dikemas kini oleh pentadbir.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
