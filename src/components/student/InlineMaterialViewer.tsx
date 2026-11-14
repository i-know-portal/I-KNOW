import {
  Download,
  FileText,
  Headphones,
  Image as ImageIcon,
  PlayCircle,
  Video,
} from 'lucide-react';
import {formatBytes, getYoutubeEmbedUrl} from '../../lib/youtube';
import type {Material} from '../../types/database';

export function MaterialTypeLabel(type: Material['material_type']): string {
  switch (type) {
    case 'pdf':
      return 'Dokumen PDF';
    case 'image':
      return 'Imej Rajah';
    case 'audio':
      return 'Rakaman Audio';
    case 'video':
      return 'Video';
    case 'youtube':
      return 'Video YouTube';
  }
}

function normalizeEmbeddablePdfUrl(url: string): string {
  // Tukar pautan Google Drive /view kepada /preview supaya boleh dipaparkan dalam iframe
  const driveMatch = url.match(/https?:\/\/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch?.[1]) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }
  return url.includes('#') ? url : `${url}#toolbar=1&navpanes=0`;
}

export function InlineMaterialViewer({material}: {material: Material}) {
  const mediaUrl = material.file_url || '';
  const youtubeEmbed =
    material.material_type === 'youtube' && material.youtube_url
      ? getYoutubeEmbedUrl(material.youtube_url)
      : null;

  const Icon =
    material.material_type === 'pdf'
      ? FileText
      : material.material_type === 'image'
        ? ImageIcon
        : material.material_type === 'audio'
          ? Headphones
          : material.material_type === 'youtube'
            ? PlayCircle
            : Video;

  return (
    <article className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <Icon className="h-5 w-5 shrink-0 text-emerald-700" />
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold text-slate-900">
              {material.title}
            </h4>
            <p className="text-xs text-slate-500">
              {MaterialTypeLabel(material.material_type)}
              {material.file_size_bytes ? ` · ${formatBytes(material.file_size_bytes)}` : ''}
            </p>
          </div>
        </div>

        {mediaUrl && material.material_type !== 'youtube' && (
          <a
            href={mediaUrl}
            target="_blank"
            rel="noreferrer"
            download={material.title}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Buka / Muat Turun
          </a>
        )}
      </div>

      {material.description && (
        <p className="border-b border-slate-100 bg-slate-50/60 px-5 py-2.5 text-xs leading-relaxed text-slate-600">
          {material.description}
        </p>
      )}

      <div className="p-4 bg-slate-50/40">
        {material.material_type === 'youtube' && (
          youtubeEmbed ? (
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-slate-950">
              <iframe
                src={youtubeEmbed}
                title={material.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <p className="text-sm text-red-700">Pautan YouTube tidak sah.</p>
          )
        )}

        {mediaUrl && material.material_type === 'pdf' && (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <iframe
              src={normalizeEmbeddablePdfUrl(mediaUrl)}
              title={material.title}
              className="h-[520px] w-full"
            />
          </div>
        )}

        {mediaUrl && material.material_type === 'image' && (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white flex justify-center">
            <img
              src={mediaUrl}
              alt={material.title}
              referrerPolicy="no-referrer"
              className="max-h-[480px] w-auto object-contain"
            />
          </div>
        )}

        {mediaUrl && material.material_type === 'audio' && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <audio controls className="w-full" src={mediaUrl}>
              Pelayar anda tidak menyokong pemain audio terbina dalam.
            </audio>
          </div>
        )}

        {mediaUrl && material.material_type === 'video' && (
          <div className="overflow-hidden rounded-lg bg-slate-950">
            <video controls className="max-h-[480px] w-full" src={mediaUrl}>
              Pelayar anda tidak menyokong pemain video terbina dalam.
            </video>
          </div>
        )}
      </div>
    </article>
  );
}
