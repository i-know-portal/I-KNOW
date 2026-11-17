import {useEffect, useState} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {useAuth} from '../../context/AuthContext';
import {parseNoteContent} from '../../lib/noteTemplates';
import {
  fetchContentBlocks,
  fetchMaterials,
  fetchQuizzes,
  fetchSubtopics,
  recordTopicProgress,
} from '../../services/learningService';
import type {
  ContentBlock,
  ContentBlockType,
  LearningModule,
  LearningProgress,
  Material,
  Quiz,
  Subtopic,
  Topic,
} from '../../types/database';
import {DalilDisplayCard} from '../common/DalilDisplayCard';
import {NoteContentRenderer} from '../common/NoteContentRenderer';
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

function getBlockCategoryLabel(type: ContentBlockType): string {
  switch (type) {
    case 'prayer_recitation':
      return 'Bacaan dalam Solat';
    case 'quran_tajwid':
      return 'Contoh Ayat & Hukum Tajwid';
    case 'activity':
      return 'Aktiviti Pembelajaran';
    case 'objective':
      return 'Objektif Khusus';
    default:
      return 'Nota Pembelajaran';
  }
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

  const currentTopicIdx = Math.max(
    0,
    topics.findIndex((t) => t.id === selectedTopicId)
  );
  const currentTopic = topics[currentTopicIdx] ?? topics[0];
  const prevTopic = currentTopicIdx > 0 ? topics[currentTopicIdx - 1] : null;
  const nextTopic =
    currentTopicIdx < topics.length - 1 ? topics[currentTopicIdx + 1] : null;

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

  const handleSelectTopic = (id: string) => {
    setSelectedTopicId(id);
    if (typeof window !== 'undefined') {
      window.scrollTo({top: 0, behavior: 'smooth'});
    }
  };

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
    <div className="space-y-6 min-w-0">
      {/* Bar Tindakan Utama (>= 44px untuk sentuhan telefon) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Senarai Modul
        </button>

        <button
          type="button"
          disabled={savingCompletion}
          onClick={handleToggleCompleted}
          className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            isCompleted
              ? 'border border-[#064e3b] bg-[#f3faf6] text-[#064e3b] hover:bg-emerald-100'
              : 'bg-[#064e3b] text-white hover:bg-[#047857]'
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

      {/* Penukar Topik Pantas pada Telefon & Tablet */}
      <div className="lg:hidden rounded-2xl border border-slate-200 bg-white p-4">
        <label
          htmlFor="mobile-topic-select"
          className="block text-xs font-semibold text-[#064e3b] mb-1.5"
        >
          {module.title} · Pilih Topik ({currentTopicIdx + 1}/{topics.length})
        </label>
        <select
          id="mobile-topic-select"
          value={currentTopic.id}
          onChange={(e) => handleSelectTopic(e.target.value)}
          className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-900"
        >
          {topics.map((topic) => {
            const done = Boolean(progressMap[topic.id]?.is_completed);
            return (
              <option key={topic.id} value={topic.id}>
                {done ? '✓ ' : ''}
                {topic.title}
              </option>
            );
          })}
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Senarai Topik Modul (Desktop Sidebar) */}
        <aside className="hidden lg:block lg:col-span-4 lg:sticky lg:top-24 space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold text-[#064e3b]">{module.title}</p>
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
                    onClick={() => handleSelectTopic(topic.id)}
                    className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors ${
                      selected
                        ? 'bg-[#064e3b] text-white font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">{topic.title}</span>
                    {done && (
                      <CheckCircle2
                        className={`h-4 w-4 shrink-0 ${
                          selected ? 'text-amber-300' : 'text-[#047857]'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Ruang Bacaan Nota Pelajar (Lebar selesa max-w-3xl, gaya Minimalist Islamic Digital Learning) */}
        <div className="lg:col-span-8 min-w-0">
          <div className="mx-auto w-full max-w-3xl space-y-6">
            {/* Kad Kepala Topik */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                <span className="font-semibold text-[#064e3b]">{module.title}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Anggaran {currentTopic.estimated_minutes} minit
                </span>
                <span aria-hidden="true">·</span>
                <span className={isCompleted ? 'font-semibold text-[#047857]' : 'text-slate-600'}>
                  {isCompleted ? 'Selesai' : 'Sedang Dipelajari'}
                </span>
              </div>

              <h1 className="mt-2.5 text-2xl sm:text-[1.75rem] font-bold tracking-tight text-slate-900">
                {currentTopic.title}
              </h1>
              <p className="mt-2.5 text-[15px] sm:text-base leading-relaxed text-slate-600">
                {currentTopic.description}
              </p>

              {currentTopic.learning_objectives.length > 0 && (
                <div className="mt-6 rounded-xl border border-[#cce7db] bg-[#f3faf6] p-4 sm:p-5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#064e3b]">
                    Objektif Pembelajaran
                  </h2>
                  <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-slate-800">
                    {currentTopic.learning_objectives.map((obj, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="font-mono-tabular text-xs font-bold text-[#064e3b] mt-1">
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
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-16 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin text-[#064e3b]" />
                Memuatkan nota, dalil dan bahan pembelajaran...
              </div>
            ) : (
              <>
                {/* Subtopik */}
                {subtopics.length > 0 && (
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                    <h2 className="text-base font-bold text-slate-900">
                      Ringkasan Subtopik
                    </h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {subtopics.map((sub, i) => (
                        <div
                          key={sub.id}
                          className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-4"
                        >
                          <p className="text-xs font-semibold text-[#064e3b]">
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

                {/* Nota Pembelajaran, Dalil, Gambar, Video & Audio */}
                {blocks.length > 0 && (
                  <section className="space-y-5">
                    {blocks.map((block, index) => {
                      const parsed = parseNoteContent(block.body);
                      return (
                        <article
                          key={block.id}
                          className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-semibold text-[#064e3b]">
                              {getBlockCategoryLabel(block.block_type)}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-tabular">
                              Bahagian {index + 1}
                            </span>
                          </div>

                          <h2 className="mt-2 text-xl sm:text-[1.375rem] font-bold tracking-tight text-slate-900">
                            {block.title}
                          </h2>

                          <DalilDisplayCard
                            arabicText={block.arabic_text}
                            transliteration={block.transliteration}
                            translation={block.translation}
                            dalilKind={parsed.dalilKind}
                            dalilSource={parsed.dalilSource}
                            className="mt-5"
                          />

                          {block.body && (
                            <div className="mt-5 border-t border-slate-100 pt-5">
                              <NoteContentRenderer body={block.body} />
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </section>
                )}

                {/* Bahan Pembelajaran Tambahan (PDF, Imej, Audio, Video, YouTube) */}
                {materials.length > 0 && (
                  <section className="space-y-4">
                    <h2 className="text-base font-bold text-slate-900">
                      Bahan Rujukan Tambahan ({materials.length})
                    </h2>
                    <div className="space-y-4">
                      {materials.map((mat) => (
                        <InlineMaterialViewer key={mat.id} material={mat} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Kuiz Topik */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                  <div className="flex items-center gap-2.5">
                    <ClipboardCheck className="h-5 w-5 text-[#064e3b]" />
                    <h2 className="text-base font-bold text-slate-900">
                      Penilaian &amp; Kuiz Topik ({quizzes.length})
                    </h2>
                  </div>

                  {quizzes.length === 0 ? (
                    <p className="mt-3 text-sm leading-relaxed text-slate-500">
                      Belum ada kuiz khusus dipautkan pada topik ini. Anda boleh mengakses semua kuiz melalui menu Kuiz Interaktif.
                    </p>
                  ) : (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {quizzes.map((q) => (
                        <div
                          key={q.id}
                          className="flex flex-col justify-between rounded-xl border border-slate-200 bg-[#fbf7ee]/60 p-4"
                        >
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">
                              {q.title}
                            </h3>
                            <p className="mt-1 text-xs leading-relaxed text-slate-600">
                              {q.description}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onStartQuiz(q.id)}
                            className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#064e3b] px-4 py-2 text-xs font-semibold text-white hover:bg-[#047857]"
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
                      <BookOpen className="h-4 w-4 text-[#064e3b]" />
                      Ringkasan Topik
                    </div>
                    <p className="mt-2 leading-relaxed">
                      Sila semak objektif pembelajaran di atas. Nota tambahan dan bahan pembelajaran sedang dikemas kini oleh pensyarah.
                    </p>
                  </div>
                )}

                {/* Navigasi Topik Sebelum / Seterusnya */}
                {(prevTopic || nextTopic) && (
                  <nav className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                    {prevTopic ? (
                      <button
                        type="button"
                        onClick={() => handleSelectTopic(prevTopic.id)}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <ArrowLeft className="h-4 w-4 shrink-0 text-[#064e3b]" />
                        <span className="truncate">Sebelumnya: {prevTopic.title}</span>
                      </button>
                    ) : (
                      <div />
                    )}

                    {nextTopic && (
                      <button
                        type="button"
                        onClick={() => handleSelectTopic(nextTopic.id)}
                        className="inline-flex min-h-[44px] items-center justify-between sm:justify-end gap-2 rounded-xl border border-[#064e3b] bg-[#f3faf6] px-4 py-2.5 text-right text-xs font-semibold text-[#064e3b] hover:bg-emerald-100"
                      >
                        <span className="truncate">Seterusnya: {nextTopic.title}</span>
                        <ArrowRight className="h-4 w-4 shrink-0" />
                      </button>
                    )}
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
