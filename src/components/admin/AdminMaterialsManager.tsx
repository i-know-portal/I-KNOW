import React, {useEffect, useRef, useState} from 'react';
import type {UploadTask} from 'firebase/storage';
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Eye,
  Link2,
  Loader2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {useAuth} from '../../context/AuthContext';
import {extractYoutubeId, formatBytes} from '../../lib/youtube';
import {
  deleteMaterial,
  fetchMaterials,
  fetchModules,
  fetchSubtopics,
  fetchTopics,
  saveMaterial,
} from '../../services/learningService';
import {
  uploadMaterialFile,
  type UploadProgressInfo,
} from '../../services/storageService';
import type {
  LearningModule,
  Material,
  MaterialType,
  PublishStatus,
  Subtopic,
  Topic,
} from '../../types/database';
import {InlineMaterialViewer, MaterialTypeLabel} from '../student/InlineMaterialViewer';

export function AdminMaterialsManager() {
  const {user} = useAuth();
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{type: 'success' | 'error'; text: string} | null>(
    null
  );

  // Borang Bahan
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [moduleId, setModuleId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [subtopicId, setSubtopicId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [materialType, setMaterialType] = useState<MaterialType>('youtube');
  const [status, setStatus] = useState<PublishStatus>('Published');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [fileSizeBytes, setFileSizeBytes] = useState<number | null>(null);
  const [uploadMode, setUploadMode] = useState<'upload' | 'url'>('upload');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTaskRef = useRef<UploadTask | null>(null);

  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);
  const [confirmDeleteMat, setConfirmDeleteMat] = useState<Material | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [mods, tops, mats] = await Promise.all([
        fetchModules(true),
        fetchTopics(undefined, true),
        fetchMaterials({includeDrafts: true}),
      ]);
      setModules(mods);
      setTopics(tops);
      setMaterials(mats);

      if (!moduleId && mods[0]) {
        setModuleId(mods[0].id);
        const firstTopic = tops.find((t) => t.module_id === mods[0].id);
        if (firstTopic) setTopicId(firstTopic.id);
      }
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memuatkan bahan pembelajaran.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!topicId) {
      setSubtopics([]);
      return;
    }
    fetchSubtopics(topicId, true)
      .then(setSubtopics)
      .catch(() => setSubtopics([]));
  }, [topicId]);

  const moduleTopics = topics.filter((t) => t.module_id === moduleId);
  const topicMap = new Map(topics.map((t) => [t.id, t.title]));
  const moduleMap = new Map(modules.map((m) => [m.id, m.title]));

  const resetForm = () => {
    setEditingId(undefined);
    setTitle('');
    setDescription('');
    setMaterialType('youtube');
    setStatus('Published');
    setYoutubeUrl('');
    setFileUrl('');
    setStoragePath(null);
    setMimeType(null);
    setFileSizeBytes(null);
    setSubtopicId('');
  };

  const handleEdit = (mat: Material) => {
    setEditingId(mat.id);
    setModuleId(mat.module_id);
    setTopicId(mat.topic_id);
    setSubtopicId(mat.subtopic_id || '');
    setTitle(mat.title);
    setDescription(mat.description);
    setMaterialType(mat.material_type);
    setStatus(mat.status);
    setYoutubeUrl(mat.youtube_url || '');
    setFileUrl(mat.file_url || '');
    setStoragePath(mat.storage_path || null);
    setMimeType(mat.mime_type || null);
    setFileSizeBytes(mat.file_size_bytes ?? null);
    setUploadMode(mat.storage_path ? 'upload' : 'url');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || materialType === 'youtube') return;

    setNotice(null);
    setUploading(true);
    setUploadProgress({percent: 0, bytesTransferred: 0, totalBytes: file.size});
    try {
      const res = await uploadMaterialFile(
        file,
        materialType,
        topicId || 'umum',
        (info) => setUploadProgress(info),
        (task) => {
          uploadTaskRef.current = task;
        }
      );
      setFileUrl(res.url);
      setStoragePath(res.storagePath);
      setMimeType(res.mimeType);
      setFileSizeBytes(res.sizeBytes);
      if (!title.trim()) {
        setTitle(file.name.replace(/\.[^.]+$/, ''));
      }
      setNotice({
        type: 'success',
        text: `Fail "${file.name}" berjaya dimuat naik ke Firebase Storage.`,
      });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memuat naik fail.',
      });
    } finally {
      uploadTaskRef.current = null;
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (!moduleId || !topicId) {
      setNotice({type: 'error', text: 'Sila pilih Modul dan Topik yang sah.'});
      return;
    }

    if (materialType === 'youtube') {
      if (!extractYoutubeId(youtubeUrl)) {
        setNotice({
          type: 'error',
          text: 'Sila masukkan pautan video YouTube yang sah (contoh: https://www.youtube.com/watch?v=...).',
        });
        return;
      }
    } else if (!fileUrl.trim().startsWith('http')) {
      setNotice({
        type: 'error',
        text: 'Sila muat naik fail ke Firebase Storage atau masukkan pautan URL bahan yang sah (https://).',
      });
      return;
    }

    setSaving(true);
    try {
      await saveMaterial({
        ...(editingId ? {id: editingId} : {}),
        module_id: moduleId,
        topic_id: topicId,
        subtopic_id: subtopicId || null,
        title: title.trim(),
        description: description.trim(),
        material_type: materialType,
        storage_path: materialType === 'youtube' ? null : storagePath,
        file_url: materialType === 'youtube' ? null : fileUrl.trim(),
        youtube_url: materialType === 'youtube' ? youtubeUrl.trim() : null,
        mime_type: materialType === 'youtube' ? null : mimeType,
        file_size_bytes: materialType === 'youtube' ? null : fileSizeBytes,
        status,
        uploaded_by: user?.uid ?? null,
      });

      resetForm();
      await loadAll();
      setNotice({
        type: 'success',
        text: 'Bahan pembelajaran berjaya disimpan ke Cloud Firestore.',
      });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan bahan pembelajaran.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (mat: Material) => {
    const nextStatus: PublishStatus = mat.status === 'Published' ? 'Draft' : 'Published';
    try {
      await saveMaterial({
        id: mat.id,
        module_id: mat.module_id,
        topic_id: mat.topic_id,
        subtopic_id: mat.subtopic_id,
        title: mat.title,
        description: mat.description,
        material_type: mat.material_type,
        storage_path: mat.storage_path,
        file_url: mat.file_url,
        youtube_url: mat.youtube_url,
        mime_type: mat.mime_type,
        file_size_bytes: mat.file_size_bytes,
        status: nextStatus,
        uploaded_by: mat.uploaded_by,
      });
      await loadAll();
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menukar status penerbitan.',
      });
    }
  };

  const handleDelete = async (mat: Material) => {
    try {
      await deleteMaterial(mat);
      setConfirmDeleteMat(null);
      await loadAll();
      setNotice({type: 'success', text: `Bahan "${mat.title}" berjaya dipadam.`});
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memadam bahan.',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-16 text-sm text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
        Memuatkan pengurus bahan pembelajaran...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Pengurusan Bahan Pembelajaran (Firebase Storage &amp; Firestore)
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Muat naik PDF, imej, audio dan video MP4/WEBM terus ke Firebase Storage atau pautkan video YouTube ke topik dan subtopik.
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

      {/* Borang Tambah / Edit Bahan */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            {editingId ? 'Edit Bahan Pembelajaran' : 'Tambah Pautan Bahan Baharu'}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Batal Edit
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-700">Modul</label>
            <select
              required
              value={moduleId}
              onChange={(e) => {
                const nextMod = e.target.value;
                setModuleId(nextMod);
                const firstTop = topics.find((t) => t.module_id === nextMod);
                setTopicId(firstTop?.id || '');
                setSubtopicId('');
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
            <label className="block text-xs font-medium text-slate-700">Topik</label>
            <select
              required
              value={topicId}
              onChange={(e) => {
                setTopicId(e.target.value);
                setSubtopicId('');
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">-- Pilih Topik --</option>
              {moduleTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Subtopik (Pilihan)
            </label>
            <select
              value={subtopicId}
              onChange={(e) => setSubtopicId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Umum Topik</option>
              {subtopics.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700">Tajuk Bahan</label>
            <input
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Nota Ringkas Rukun Solat (PDF)"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">Jenis Bahan</label>
              <select
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value as MaterialType)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
              >
                <option value="youtube">Video YouTube</option>
                <option value="image">Gambar (Muat Naik / URL)</option>
                <option value="video">Video MP4 / WEBM</option>
                <option value="pdf">Dokumen PDF</option>
                <option value="audio">Audio</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PublishStatus)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
              >
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">
            Penerangan Ringkas
          </label>
          <input
            type="text"
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ringkasan kandungan bahan untuk rujukan pelajar"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {materialType === 'youtube' ? (
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Pautan Video YouTube
            </label>
            <input
              type="url"
              required
              maxLength={500}
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800">
                Sumber Fail ({MaterialTypeLabel(materialType)})
              </span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setUploadMode('upload')}
                  className={`rounded-md px-2.5 py-1 font-medium ${
                    uploadMode === 'upload'
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-600'
                  }`}
                >
                  Muat Naik Terus
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('url')}
                  className={`rounded-md px-2.5 py-1 font-medium ${
                    uploadMode === 'url' ? 'bg-emerald-700 text-white' : 'text-slate-600'
                  }`}
                >
                  Pautan URL
                </button>
              </div>
            </div>

            {uploadMode === 'upload' ? (
              <div className="space-y-2.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={
                    materialType === 'image'
                      ? 'image/*'
                      : materialType === 'video'
                        ? '.mp4,.webm,video/mp4,video/webm'
                        : materialType === 'pdf'
                          ? 'application/pdf,.pdf'
                          : 'audio/*'
                  }
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 bg-white p-3">
                  <div className="text-xs text-slate-600">
                    {fileUrl ? (
                      <p className="font-semibold text-emerald-800">
                        Fail sedia disimpan{' '}
                        {fileSizeBytes ? `(${formatBytes(fileSizeBytes)})` : ''}
                      </p>
                    ) : (
                      <p>
                        Pilih fail {MaterialTypeLabel(materialType)} daripada komputer atau telefon untuk dimuat naik ke Firebase Storage.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploading
                      ? 'Memuat Naik...'
                      : fileUrl
                        ? 'Gantikan Fail'
                        : 'Pilih & Muat Naik Fail'}
                  </button>
                </div>

                {uploading && uploadProgress && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-emerald-900">
                      <span>
                        {uploadProgress.percent}% ({formatBytes(uploadProgress.bytesTransferred)} /{' '}
                        {formatBytes(uploadProgress.totalBytes)})
                      </span>
                      <button
                        type="button"
                        onClick={() => uploadTaskRef.current?.cancel()}
                        className="text-red-700 font-semibold hover:underline"
                      >
                        Batal
                      </button>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-200">
                      <div
                        className="h-full bg-emerald-700 transition-all"
                        style={{width: `${uploadProgress.percent}%`}}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Pautan URL Bahan ({MaterialTypeLabel(materialType)})
                </label>
                <input
                  type="url"
                  required
                  maxLength={1000}
                  value={fileUrl}
                  onChange={(e) => {
                    setFileUrl(e.target.value);
                    setStoragePath(null);
                  }}
                  placeholder="https://..."
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            <Link2 className="h-4 w-4" />
            {saving
              ? 'Menyimpan...'
              : editingId
                ? 'Kemas Kini Bahan'
                : 'Simpan & Pautkan ke Topik'}
          </button>
        </div>
      </form>

      {/* Senarai Bahan Pembelajaran */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-bold text-slate-900">
          Senarai Semua Bahan ({materials.length})
        </h2>

        {materials.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Belum ada bahan ditambah. Gunakan borang di atas untuk memautkan PDF, imej,
            audio, video atau YouTube kepada topik.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2 pr-4 font-medium">Tajuk</th>
                  <th className="py-2 pr-4 font-medium">Jenis</th>
                  <th className="py-2 pr-4 font-medium">Modul &amp; Topik</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 text-right font-medium">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {materials.map((mat) => (
                  <tr key={mat.id}>
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-slate-900">{mat.title}</p>
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-700">
                      {MaterialTypeLabel(mat.material_type)}
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-600">
                      <p className="font-medium text-slate-800">
                        {moduleMap.get(mat.module_id) || 'Modul'}
                      </p>
                      <p>{topicMap.get(mat.topic_id) || 'Topik'}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(mat)}
                        className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                          mat.status === 'Published'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-amber-200 bg-amber-50 text-amber-800'
                        }`}
                      >
                        {mat.status}
                      </button>
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewMaterial(mat)}
                          title="Pratonton dalam skrin"
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:text-emerald-800"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(mat)}
                          title="Edit"
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:text-emerald-800"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteMat(mat)}
                          title="Padam"
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Pratonton Terbina Dalam */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Pratonton Bahan Pembelajaran
              </h3>
              <button
                type="button"
                onClick={() => setPreviewMaterial(null)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <InlineMaterialViewer material={previewMaterial} />
          </div>
        </div>
      )}

      {/* Modal Pengesahan Padam Bahan */}
      {confirmDeleteMat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Sahkan Pemadaman Bahan</h3>
            <p className="text-sm text-slate-600">
              Padam bahan <strong className="text-slate-900">"{confirmDeleteMat.title}"</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteMat(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDeleteMat)}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                Ya, Padam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
