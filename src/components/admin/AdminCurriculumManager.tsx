import React, {useEffect, useState} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Edit3,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import {useAuth} from '../../context/AuthContext';
import {
  deleteContentBlock,
  deleteModule,
  deleteSubtopic,
  deleteTopic,
  fetchContentBlocks,
  fetchModules,
  fetchSubtopics,
  fetchTopics,
  saveContentBlock,
  saveSubtopic,
  saveTopic,
  seedInitialCurriculum,
  slugify,
  upsertModule,
} from '../../services/learningService';
import type {
  ContentBlock,
  ContentBlockType,
  LearningModule,
  PublishStatus,
  Subtopic,
  Topic,
} from '../../types/database';

export function AdminCurriculumManager() {
  const {user} = useAuth();
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);

  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [notice, setNotice] = useState<{type: 'success' | 'error'; text: string} | null>(
    null
  );

  // Borang Modul
  const [modFormOpen, setModFormOpen] = useState(false);
  const [editingModId, setEditingModId] = useState<string | undefined>(undefined);
  const [modCode, setModCode] = useState('');
  const [modTitle, setModTitle] = useState('');
  const [modDesc, setModDesc] = useState('');
  const [modOrder, setModOrder] = useState(1);
  const [modStatus, setModStatus] = useState<PublishStatus>('Published');

  // Borang Topik
  const [topicFormOpen, setTopicFormOpen] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState<string | undefined>(undefined);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [topicObjectivesText, setTopicObjectivesText] = useState('');
  const [topicOrder, setTopicOrder] = useState(1);
  const [topicMinutes, setTopicMinutes] = useState(15);
  const [topicStatus, setTopicStatus] = useState<PublishStatus>('Published');

  // Borang Subtopik
  const [subTitle, setSubTitle] = useState('');
  const [subSummary, setSubSummary] = useState('');
  const [editingSubId, setEditingSubId] = useState<string | undefined>(undefined);

  // Borang Blok Kandungan
  const [blockType, setBlockType] = useState<ContentBlockType>('note');
  const [blockTitle, setBlockTitle] = useState('');
  const [blockBody, setBlockBody] = useState('');
  const [blockArabic, setBlockArabic] = useState('');
  const [blockTranslit, setBlockTranslit] = useState('');
  const [blockTranslation, setBlockTranslation] = useState('');
  const [blockSubtopicId, setBlockSubtopicId] = useState<string>('');
  const [blockStatus, setBlockStatus] = useState<PublishStatus>('Published');
  const [editingBlockId, setEditingBlockId] = useState<string | undefined>(undefined);

  const loadCurriculum = async () => {
    setLoading(true);
    try {
      const [mods, tops] = await Promise.all([
        fetchModules(true),
        fetchTopics(undefined, true),
      ]);
      setModules(mods);
      setTopics(tops);
      const nextModId = selectedModuleId || mods[0]?.id || '';
      setSelectedModuleId(nextModId);
      const firstTopic = tops.find((t) => t.module_id === nextModId);
      if (!selectedTopicId && firstTopic) {
        setSelectedTopicId(firstTopic.id);
      }
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memuatkan kurikulum.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurriculum();
  }, []);

  useEffect(() => {
    if (!selectedTopicId) {
      setSubtopics([]);
      setBlocks([]);
      return;
    }
    Promise.all([
      fetchSubtopics(selectedTopicId, true),
      fetchContentBlocks(selectedTopicId, true),
    ])
      .then(([subs, blks]) => {
        setSubtopics(subs);
        setBlocks(blks);
      })
      .catch(() => {});
  }, [selectedTopicId]);

  const moduleTopics = topics.filter((t) => t.module_id === selectedModuleId);

  const openNewModule = () => {
    setEditingModId(undefined);
    setModCode('');
    setModTitle('');
    setModDesc('');
    setModOrder(modules.length + 1);
    setModStatus('Published');
    setModFormOpen(true);
  };

  const openEditModule = (mod: LearningModule) => {
    setEditingModId(mod.id);
    setModCode(mod.code);
    setModTitle(mod.title);
    setModDesc(mod.description);
    setModOrder(mod.sort_order);
    setModStatus(mod.status);
    setModFormOpen(true);
  };

  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    try {
      const saved = await upsertModule({
        ...(editingModId ? {id: editingModId} : {}),
        code: modCode.trim().toUpperCase(),
        title: modTitle.trim(),
        slug: slugify(modTitle),
        description: modDesc.trim(),
        icon_name: 'book-open',
        sort_order: Number(modOrder) || 1,
        status: modStatus,
        created_by: user?.uid ?? null,
      });
      setModFormOpen(false);
      setSelectedModuleId(saved.id);
      await loadCurriculum();
      setNotice({type: 'success', text: `Modul "${saved.title}" berjaya disimpan.`});
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan modul.',
      });
    }
  };

  const handleDeleteModule = async (mod: LearningModule) => {
    try {
      await deleteModule(mod.id);
      if (selectedModuleId === mod.id) {
        setSelectedModuleId('');
        setSelectedTopicId('');
      }
      await loadCurriculum();
      setNotice({type: 'success', text: `Modul "${mod.title}" dipadam.`});
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memadam modul.',
      });
    }
  };

  const openNewTopic = () => {
    setEditingTopicId(undefined);
    setTopicTitle('');
    setTopicDesc('');
    setTopicObjectivesText('');
    setTopicOrder(moduleTopics.length + 1);
    setTopicMinutes(20);
    setTopicStatus('Published');
    setTopicFormOpen(true);
  };

  const openEditTopic = (t: Topic) => {
    setEditingTopicId(t.id);
    setTopicTitle(t.title);
    setTopicDesc(t.description);
    setTopicObjectivesText((t.learning_objectives || []).join('\n'));
    setTopicOrder(t.sort_order);
    setTopicMinutes(t.estimated_minutes);
    setTopicStatus(t.status);
    setTopicFormOpen(true);
  };

  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModuleId) return;
    setNotice(null);
    const objectives = topicObjectivesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const saved = await saveTopic({
        ...(editingTopicId ? {id: editingTopicId} : {}),
        module_id: selectedModuleId,
        title: topicTitle.trim(),
        slug: slugify(topicTitle) || `topik-${Date.now()}`,
        description: topicDesc.trim(),
        learning_objectives: objectives,
        sort_order: Number(topicOrder) || 1,
        estimated_minutes: Number(topicMinutes) || 15,
        status: topicStatus,
      });
      setTopicFormOpen(false);
      setSelectedTopicId(saved.id);
      await loadCurriculum();
      setNotice({type: 'success', text: `Topik "${saved.title}" berjaya disimpan.`});
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan topik.',
      });
    }
  };

  const handleDeleteTopic = async (topic: Topic) => {
    try {
      await deleteTopic(topic.id);
      if (selectedTopicId === topic.id) setSelectedTopicId('');
      await loadCurriculum();
      setNotice({type: 'success', text: `Topik "${topic.title}" dipadam.`});
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memadam topik.',
      });
    }
  };

  const handleSaveSubtopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopicId || !subTitle.trim()) return;
    try {
      await saveSubtopic({
        ...(editingSubId ? {id: editingSubId} : {}),
        topic_id: selectedTopicId,
        title: subTitle.trim(),
        summary: subSummary.trim(),
        sort_order: subtopics.length + 1,
        status: 'Published',
      });
      setSubTitle('');
      setSubSummary('');
      setEditingSubId(undefined);
      const updated = await fetchSubtopics(selectedTopicId, true);
      setSubtopics(updated);
      setNotice({type: 'success', text: 'Subtopik berjaya disimpan.'});
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan subtopik.',
      });
    }
  };

  const handleDeleteSubtopic = async (id: string) => {
    await deleteSubtopic(id);
    setSubtopics((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSaveBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopicId || !blockTitle.trim()) return;
    try {
      await saveContentBlock({
        ...(editingBlockId ? {id: editingBlockId} : {}),
        topic_id: selectedTopicId,
        subtopic_id: blockSubtopicId || null,
        block_type: blockType,
        title: blockTitle.trim(),
        body: blockBody.trim(),
        arabic_text: blockArabic.trim() || null,
        transliteration: blockTranslit.trim() || null,
        translation: blockTranslation.trim() || null,
        sort_order: blocks.length + 1,
        status: blockStatus,
      });
      setEditingBlockId(undefined);
      setBlockTitle('');
      setBlockBody('');
      setBlockArabic('');
      setBlockTranslit('');
      setBlockTranslation('');
      setBlockSubtopicId('');
      const updated = await fetchContentBlocks(selectedTopicId, true);
      setBlocks(updated);
      setNotice({type: 'success', text: 'Nota / blok kandungan berjaya disimpan.'});
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan blok kandungan.',
      });
    }
  };

  const handleDeleteBlock = async (id: string) => {
    await deleteContentBlock(id);
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-16 text-sm text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
        Memuatkan pengurusan kurikulum...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Pengurusan Modul, Topik, Subtopik &amp; Nota
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Tambah, edit, padam dan kawal status penerbitan kandungan Solat dan Tajwid.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={seeding}
            onClick={async () => {
              if (!user) return;
              setSeeding(true);
              setNotice(null);
              try {
                await seedInitialCurriculum(user.uid);
                await loadCurriculum();
                setNotice({
                  type: 'success',
                  text: 'Kurikulum awal Modul 1 (10 topik Solat), Modul 2 (10 topik Tajwid) & kuiz contoh berjaya diisi ke Cloud Firestore.',
                });
              } catch (err) {
                setNotice({
                  type: 'error',
                  text: err instanceof Error ? err.message : 'Gagal mengisi kurikulum awal.',
                });
              } finally {
                setSeeding(false);
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-700 bg-white px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
          >
            <Database className="h-4 w-4" />
            {seeding ? 'Mengisi Kurikulum...' : 'Isi Kurikulum Awal (Solat & Tajwid)'}
          </button>

          <button
            type="button"
            onClick={openNewModule}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            Tambah Modul Baharu
          </button>
        </div>
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

      {/* Borang Modul */}
      {modFormOpen && (
        <form
          onSubmit={handleSaveModule}
          className="rounded-2xl border border-emerald-200 bg-white p-6 space-y-4"
        >
          <h2 className="text-base font-bold text-slate-900">
            {editingModId ? 'Edit Modul Pembelajaran' : 'Tambah Modul Baharu'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">Kod Modul</label>
              <input
                type="text"
                required
                value={modCode}
                onChange={(e) => setModCode(e.target.value)}
                placeholder="MOD-SOLAT"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700">Tajuk Modul</label>
              <input
                type="text"
                required
                value={modTitle}
                onChange={(e) => setModTitle(e.target.value)}
                placeholder="MODUL 1: PEMBELAJARAN SOLAT"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Huraian</label>
            <textarea
              rows={2}
              value={modDesc}
              onChange={(e) => setModDesc(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-700">Urutan</label>
              <input
                type="number"
                min={1}
                value={modOrder}
                onChange={(e) => setModOrder(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Status Penerbitan</label>
              <select
                value={modStatus}
                onChange={(e) => setModStatus(e.target.value as PublishStatus)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="Published">Published (Diterbitkan)</option>
                <option value="Draft">Draft (Draf)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setModFormOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              Simpan Modul
            </button>
          </div>
        </form>
      )}

      {/* Pemilih Modul */}
      <section className="grid gap-4 md:grid-cols-2">
        {modules.map((mod) => {
          const isSelected = mod.id === selectedModuleId;
          return (
            <div
              key={mod.id}
              onClick={() => {
                setSelectedModuleId(mod.id);
                const first = topics.find((t) => t.module_id === mod.id);
                setSelectedTopicId(first?.id || '');
              }}
              className={`cursor-pointer rounded-2xl border p-5 transition-colors ${
                isSelected
                  ? 'border-emerald-700 bg-emerald-50/40'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    {mod.code} · {mod.status}
                  </p>
                  <h2 className="mt-0.5 text-base font-bold text-slate-900">
                    {mod.title}
                  </h2>
                </div>
                <div
                  className="flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => openEditModule(mod)}
                    title="Edit Modul"
                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:text-emerald-800"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteModule(mod)}
                    title="Padam Modul"
                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-600 line-clamp-2">
                {mod.description}
              </p>
            </div>
          );
        })}
      </section>

      {/* Pengurusan Topik Dalam Modul Terpilih */}
      {selectedModuleId && (
        <div className="grid gap-6 lg:grid-cols-12">
          <section className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Topik Modul ({moduleTopics.length})
              </h2>
              <button
                type="button"
                onClick={openNewTopic}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                <Plus className="h-3.5 w-3.5" />
                Topik
              </button>
            </div>

            {topicFormOpen && (
              <form
                onSubmit={handleSaveTopic}
                className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-3"
              >
                <input
                  type="text"
                  required
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  placeholder="Tajuk topik (cth: 1. Pengenalan Solat)"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
                <textarea
                  rows={2}
                  value={topicDesc}
                  onChange={(e) => setTopicDesc(e.target.value)}
                  placeholder="Ringkasan topik"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
                <textarea
                  rows={3}
                  value={topicObjectivesText}
                  onChange={(e) => setTopicObjectivesText(e.target.value)}
                  placeholder="Objektif pembelajaran (satu objektif setiap baris)"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min={1}
                    value={topicOrder}
                    onChange={(e) => setTopicOrder(Number(e.target.value))}
                    placeholder="Urutan"
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    min={5}
                    value={topicMinutes}
                    onChange={(e) => setTopicMinutes(Number(e.target.value))}
                    placeholder="Minit"
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                  <select
                    value={topicStatus}
                    onChange={(e) => setTopicStatus(e.target.value as PublishStatus)}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                  >
                    <option value="Published">Published</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setTopicFormOpen(false)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Simpan Topik
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {moduleTopics.map((t) => {
                const active = t.id === selectedTopicId;
                return (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${
                      active
                        ? 'border-emerald-700 bg-emerald-50/60'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedTopicId(t.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {t.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t.status} · {t.estimated_minutes} minit
                      </p>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditTopic(t)}
                        className="rounded p-1.5 text-slate-500 hover:text-emerald-800"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTopic(t)}
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

          {/* Subtopik & Nota bagi Topik Terpilih */}
          <section className="lg:col-span-7 space-y-6">
            {!selectedTopicId ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                Pilih satu topik di sebelah kiri untuk mengurus subtopik, nota dan
                aktiviti pembelajaran.
              </div>
            ) : (
              <>
                {/* Pengurusan Subtopik */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                  <h3 className="text-base font-bold text-slate-900">
                    Subtopik ({subtopics.length})
                  </h3>

                  <form onSubmit={handleSaveSubtopic} className="grid gap-2 sm:grid-cols-12">
                    <input
                      type="text"
                      required
                      value={subTitle}
                      onChange={(e) => setSubTitle(e.target.value)}
                      placeholder="Tajuk subtopik baharu"
                      className="sm:col-span-5 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={subSummary}
                      onChange={(e) => setSubSummary(e.target.value)}
                      placeholder="Ringkasan ringkas"
                      className="sm:col-span-5 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      className="sm:col-span-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      {editingSubId ? 'Kemas Kini' : 'Tambah'}
                    </button>
                  </form>

                  <ul className="divide-y divide-slate-100">
                    {subtopics.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between gap-3 py-2.5 text-sm"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{s.title}</p>
                          {s.summary && (
                            <p className="text-xs text-slate-500">{s.summary}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSubId(s.id);
                              setSubTitle(s.title);
                              setSubSummary(s.summary);
                            }}
                            className="rounded p-1.5 text-slate-500 hover:text-emerald-800"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubtopic(s.id)}
                            className="rounded p-1.5 text-slate-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Pengurusan Nota, Bacaan & Aktiviti */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                  <h3 className="text-base font-bold text-slate-900">
                    Nota, Lafaz Arab &amp; Aktiviti ({blocks.length})
                  </h3>

                  <form
                    onSubmit={handleSaveBlock}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
                  >
                    <div className="grid gap-3 sm:grid-cols-3">
                      <select
                        value={blockType}
                        onChange={(e) => setBlockType(e.target.value as ContentBlockType)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium"
                      >
                        <option value="note">Nota Pembelajaran</option>
                        <option value="prayer_recitation">Bacaan dalam Solat</option>
                        <option value="quran_tajwid">Contoh Ayat &amp; Tajwid</option>
                        <option value="activity">Aktiviti Pembelajaran</option>
                      </select>

                      <select
                        value={blockSubtopicId}
                        onChange={(e) => setBlockSubtopicId(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                      >
                        <option value="">Pautan: Umum Topik</option>
                        {subtopics.map((s) => (
                          <option key={s.id} value={s.id}>
                            Subtopik: {s.title}
                          </option>
                        ))}
                      </select>

                      <select
                        value={blockStatus}
                        onChange={(e) => setBlockStatus(e.target.value as PublishStatus)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                      >
                        <option value="Published">Published</option>
                        <option value="Draft">Draft</option>
                      </select>
                    </div>

                    <input
                      type="text"
                      required
                      value={blockTitle}
                      onChange={(e) => setBlockTitle(e.target.value)}
                      placeholder="Tajuk nota / bacaan / aktiviti"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    />

                    <textarea
                      rows={3}
                      value={blockBody}
                      onChange={(e) => setBlockBody(e.target.value)}
                      placeholder="Huraian isi kandungan atau arahan aktiviti"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    />

                    <input
                      type="text"
                      value={blockArabic}
                      onChange={(e) => setBlockArabic(e.target.value)}
                      placeholder="Teks Arab (pilihan, cth: سُبْحَانَ رَبِّيَ الْعَظِيمِ)"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-right font-arabic"
                    />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        type="text"
                        value={blockTranslit}
                        onChange={(e) => setBlockTranslit(e.target.value)}
                        placeholder="Transliterasi Rumi (pilihan)"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                      />
                      <input
                        type="text"
                        value={blockTranslation}
                        onChange={(e) => setBlockTranslation(e.target.value)}
                        placeholder="Terjemahan Bahasa Melayu (pilihan)"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      {editingBlockId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBlockId(undefined);
                            setBlockTitle('');
                            setBlockBody('');
                            setBlockArabic('');
                            setBlockTranslit('');
                            setBlockTranslation('');
                          }}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
                        >
                          Batal Edit
                        </button>
                      )}
                      <button
                        type="submit"
                        className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                      >
                        {editingBlockId ? 'Simpan Perubahan' : 'Tambah Blok Kandungan'}
                      </button>
                    </div>
                  </form>

                  <div className="space-y-2.5">
                    {blocks.map((blk) => (
                      <div
                        key={blk.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3.5"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-amber-700">
                            {blk.block_type} · {blk.status}
                          </p>
                          <p className="text-sm font-semibold text-slate-900">
                            {blk.title}
                          </p>
                          {blk.arabic_text && (
                            <p className="mt-1 text-lg font-arabic text-slate-800">
                              {blk.arabic_text}
                            </p>
                          )}
                          <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                            {blk.body}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBlockId(blk.id);
                              setBlockType(blk.block_type);
                              setBlockTitle(blk.title);
                              setBlockBody(blk.body);
                              setBlockArabic(blk.arabic_text || '');
                              setBlockTranslit(blk.transliteration || '');
                              setBlockTranslation(blk.translation || '');
                              setBlockSubtopicId(blk.subtopic_id || '');
                              setBlockStatus(blk.status);
                            }}
                            className="rounded p-1.5 text-slate-500 hover:text-emerald-800"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBlock(blk.id)}
                            className="rounded p-1.5 text-slate-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
