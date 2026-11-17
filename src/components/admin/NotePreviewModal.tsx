import {useState} from 'react';
import {CheckCircle2, FileEdit, Monitor, Smartphone, X} from 'lucide-react';
import type {ContentBlockType, PublishStatus} from '../../types/database';
import {NoteContentRenderer} from '../common/NoteContentRenderer';

interface NotePreviewModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  blockType: ContentBlockType;
  status: PublishStatus;
  serializedBody: string;
  arabicText?: string | null;
  transliteration?: string | null;
  translation?: string | null;
  isEditing?: boolean;
  saving?: boolean;
  onSaveDraft?: () => void;
  onPublish?: () => void;
}

function getBlockTypeLabel(type: ContentBlockType): string {
  switch (type) {
    case 'prayer_recitation':
      return 'Bacaan dalam Solat';
    case 'quran_tajwid':
      return 'Contoh Ayat & Hukum Tajwid';
    case 'activity':
      return 'Aktiviti Pembelajaran';
    case 'objective':
      return 'Objektif Pembelajaran';
    default:
      return 'Nota Pembelajaran';
  }
}

export function NotePreviewModal({
  open,
  onClose,
  title,
  blockType,
  status,
  serializedBody,
  arabicText,
  transliteration,
  translation,
  isEditing,
  saving,
  onSaveDraft,
  onPublish,
}: NotePreviewModalProps) {
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-2xl">
        {/* Header Pratonton & Penukar Desktop / Telefon */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3.5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Pratonton Nota Pelajar
            </p>
            <h3 className="text-sm font-bold text-slate-900">
              {title.trim() || 'Nota Tanpa Tajuk'}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setViewport('desktop')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewport === 'desktop'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setViewport('mobile')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewport === 'mobile'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                Telefon
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pratonton"
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Kanvas Pratonton */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center">
          <div
            className={`transition-all duration-200 ${
              viewport === 'mobile'
                ? 'w-full max-w-[390px] rounded-[28px] border-4 border-slate-800 bg-slate-50 p-3 shadow-xl'
                : 'w-full max-w-3xl'
            }`}
          >
            <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-amber-700">
                  {getBlockTypeLabel(blockType)}
                </p>
                <span
                  className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                    status === 'Published'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-amber-200 bg-amber-50 text-amber-800'
                  }`}
                >
                  {status === 'Published' ? 'Diterbitkan' : 'Draf'}
                </span>
              </div>

              <h2 className="mt-1.5 text-xl font-bold text-slate-900">
                {title.trim() || 'Tajuk Nota'}
              </h2>

              {arabicText && (
                <div className="mt-4 rounded-xl border border-amber-200/70 bg-amber-50/40 px-4 py-4 text-center">
                  <p className="text-2xl sm:text-3xl font-arabic text-slate-900">
                    {arabicText}
                  </p>
                  {transliteration && (
                    <p className="mt-2 text-sm italic text-emerald-900">
                      {transliteration}
                    </p>
                  )}
                  {translation && (
                    <p className="mt-1 text-xs text-slate-600">
                      Maksud: {translation}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4">
                {serializedBody.trim() ? (
                  <NoteContentRenderer body={serializedBody} />
                ) : (
                  <p className="text-sm italic text-slate-400">
                    Tiada isi kandungan nota lagi.
                  </p>
                )}
              </div>
            </article>
          </div>
        </div>

        {/* Footer Tindakan */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3.5">
          <p className="text-xs text-slate-500">
            Mod: {viewport === 'desktop' ? 'Paparan Desktop' : 'Paparan Telefon (390px)'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Kembali Menyunting
            </button>
            {onSaveDraft && (
              <button
                type="button"
                disabled={saving}
                onClick={onSaveDraft}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
              >
                <FileEdit className="h-3.5 w-3.5" />
                Simpan sebagai Draf
              </button>
            )}
            {onPublish && (
              <button
                type="button"
                disabled={saving}
                onClick={onPublish}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isEditing && status === 'Published'
                  ? 'Kemas Kini Diterbitkan'
                  : 'Terbitkan Nota'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
