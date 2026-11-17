import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Headphones, Maximize2, Pause, Play, Volume2, VolumeX, X} from 'lucide-react';
import {parseNoteContent, sanitizeNoteHtml} from '../../lib/noteTemplates';

interface VideoSegment {
  type: 'video';
  src: string;
  caption?: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface AudioSegment {
  type: 'audio';
  src: string;
  caption?: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface HtmlSegment {
  type: 'html';
  html: string;
}

type ContentSegment = HtmlSegment | VideoSegment | AudioSegment;

function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function InlineNoteVideoPlayer({
  src,
  caption,
  align = 'center',
  width = '100%',
}: {
  src: string;
  caption?: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      void vid.play();
    } else {
      vid.pause();
    }
  };

  const toggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setMuted(vid.muted);
  };

  const handleFullscreen = () => {
    const target = containerRef.current ?? videoRef.current;
    if (!target) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else if (target.requestFullscreen) {
      void target.requestFullscreen();
    } else if (
      videoRef.current &&
      'webkitEnterFullscreen' in videoRef.current &&
      typeof (videoRef.current as unknown as {webkitEnterFullscreen?: () => void})
        .webkitEnterFullscreen === 'function'
    ) {
      (videoRef.current as unknown as {webkitEnterFullscreen: () => void}).webkitEnterFullscreen();
    }
  };

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setCurrentTime(vid.currentTime);
    const onMeta = () => setDuration(vid.duration || 0);
    vid.addEventListener('play', onPlay);
    vid.addEventListener('pause', onPause);
    vid.addEventListener('ended', onPause);
    vid.addEventListener('timeupdate', onTime);
    vid.addEventListener('loadedmetadata', onMeta);
    return () => {
      vid.removeEventListener('play', onPlay);
      vid.removeEventListener('pause', onPause);
      vid.removeEventListener('ended', onPause);
      vid.removeEventListener('timeupdate', onTime);
      vid.removeEventListener('loadedmetadata', onMeta);
    };
  }, []);

  const alignClass =
    align === 'left'
      ? 'items-start'
      : align === 'right'
        ? 'items-end'
        : 'items-center';

  return (
    <figure className={`my-5 flex flex-col gap-2 max-w-full ${alignClass}`}>
      <div
        ref={containerRef}
        style={{width: width || '100%', maxWidth: '100%'}}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950"
      >
        <video
          ref={videoRef}
          src={src}
          controls
          playsInline
          preload="metadata"
          className="max-h-[480px] w-full bg-slate-950"
        >
          Pelayar anda tidak menyokong pemain video terbina dalam.
        </video>
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200">
          <button
            type="button"
            onClick={togglePlay}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 font-semibold text-white hover:bg-emerald-600"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? 'Jeda' : 'Main'}
          </button>

          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={Math.min(currentTime, duration || 100)}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (videoRef.current) {
                videoRef.current.currentTime = next;
                setCurrentTime(next);
              }
            }}
            aria-label="Garis masa video"
            className="h-2 flex-1 min-w-[90px] accent-emerald-500 cursor-pointer"
          />

          <span className="font-mono-tabular text-[11px] text-slate-300">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>

          <button
            type="button"
            onClick={toggleMute}
            title={muted ? 'Nyahsenyap' : 'Senyap'}
            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-slate-700 p-2 text-slate-200 hover:bg-slate-800"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={handleFullscreen}
            title="Skrin Penuh"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-slate-200 hover:bg-slate-800"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Skrin Penuh</span>
          </button>
        </div>
      </div>
      {caption && (
        <figcaption className="text-[13px] leading-snug text-slate-500 text-center">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

export function InlineNoteAudioPlayer({
  src,
  caption,
  align = 'center',
  width = '100%',
}: {
  src: string;
  caption?: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    const aud = audioRef.current;
    if (!aud) return;
    if (aud.paused) {
      void aud.play();
    } else {
      aud.pause();
    }
  };

  const toggleMute = () => {
    const aud = audioRef.current;
    if (!aud) return;
    aud.muted = !aud.muted;
    setMuted(aud.muted);
  };

  useEffect(() => {
    const aud = audioRef.current;
    if (!aud) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setCurrentTime(aud.currentTime);
    const onMeta = () => setDuration(aud.duration || 0);
    aud.addEventListener('play', onPlay);
    aud.addEventListener('pause', onPause);
    aud.addEventListener('ended', onPause);
    aud.addEventListener('timeupdate', onTime);
    aud.addEventListener('loadedmetadata', onMeta);
    return () => {
      aud.removeEventListener('play', onPlay);
      aud.removeEventListener('pause', onPause);
      aud.removeEventListener('ended', onPause);
      aud.removeEventListener('timeupdate', onTime);
      aud.removeEventListener('loadedmetadata', onMeta);
    };
  }, []);

  const alignClass =
    align === 'left'
      ? 'items-start'
      : align === 'right'
        ? 'items-end'
        : 'items-center';

  return (
    <figure className={`my-5 flex flex-col gap-1.5 max-w-full ${alignClass}`}>
      <div
        style={{width: width || '100%', maxWidth: '100%'}}
        className="rounded-2xl border border-[#e6dcc6] bg-[#fbf7ee] p-3.5 sm:p-4"
      >
        <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
        <div className="flex items-center justify-between gap-2 pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#064e3b] text-white">
              <Headphones className="h-4 w-4" />
            </span>
            <span className="truncate text-xs font-semibold text-slate-900">
              {caption || 'Rakaman Audio Pembelajaran'}
            </span>
          </div>
          <span className="font-mono-tabular text-[11px] font-medium text-slate-600 shrink-0">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={togglePlay}
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#064e3b] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#047857]"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{playing ? 'Jeda' : 'Main'}</span>
          </button>

          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={Math.min(currentTime, duration || 100)}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (audioRef.current) {
                audioRef.current.currentTime = next;
                setCurrentTime(next);
              }
            }}
            aria-label="Garis masa audio"
            className="h-2 flex-1 min-w-[90px] accent-[#064e3b] cursor-pointer"
          />

          <button
            type="button"
            onClick={toggleMute}
            title={muted ? 'Nyahsenyap' : 'Senyap'}
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-[#e6dcc6] bg-white text-slate-700 hover:bg-slate-50"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </figure>
  );
}

function splitHtmlAndMedia(sanitizedHtml: string): ContentSegment[] {
  if (!sanitizedHtml) return [];
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return [{type: 'html', html: sanitizedHtml}];
  }

  const doc = new DOMParser().parseFromString(sanitizedHtml, 'text/html');
  const segments: ContentSegment[] = [];
  let htmlBuffer = '';

  const flushHtml = () => {
    if (htmlBuffer.trim()) {
      segments.push({type: 'html', html: htmlBuffer});
      htmlBuffer = '';
    }
  };

  for (const child of Array.from(doc.body.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;

      const isVideoFigure =
        el.tagName === 'FIGURE' &&
        (el.getAttribute('data-iknow-type') === 'video' || Boolean(el.querySelector('video')));
      const isDirectVideo = el.tagName === 'VIDEO';

      if (isVideoFigure || isDirectVideo) {
        const videoEl = isDirectVideo ? el : el.querySelector('video');
        const src =
          videoEl?.getAttribute('src') || videoEl?.querySelector('source')?.getAttribute('src') || '';
        if (src) {
          flushHtml();
          const alignRaw = el.getAttribute('data-align');
          const align =
            alignRaw === 'left' || alignRaw === 'right' || alignRaw === 'center'
              ? alignRaw
              : 'center';
          const width = el.getAttribute('data-width') || videoEl?.style.width || '100%';
          const caption = el.querySelector('figcaption')?.textContent?.trim() || undefined;
          segments.push({
            type: 'video',
            src,
            caption,
            align,
            width,
          });
          continue;
        }
      }

      const isAudioFigure =
        el.tagName === 'FIGURE' &&
        (el.getAttribute('data-iknow-type') === 'audio' || Boolean(el.querySelector('audio')));
      const isDirectAudio = el.tagName === 'AUDIO';

      if (isAudioFigure || isDirectAudio) {
        const audioEl = isDirectAudio ? el : el.querySelector('audio');
        const src =
          audioEl?.getAttribute('src') || audioEl?.querySelector('source')?.getAttribute('src') || '';
        if (src) {
          flushHtml();
          const alignRaw = el.getAttribute('data-align');
          const align =
            alignRaw === 'left' || alignRaw === 'right' || alignRaw === 'center'
              ? alignRaw
              : 'center';
          const width = el.getAttribute('data-width') || audioEl?.style.width || '100%';
          const caption = el.querySelector('figcaption')?.textContent?.trim() || undefined;
          segments.push({
            type: 'audio',
            src,
            caption,
            align,
            width,
          });
          continue;
        }
      }

      htmlBuffer += el.outerHTML;
    } else if (child.nodeType === Node.TEXT_NODE) {
      if (child.textContent?.trim()) {
        htmlBuffer += `<p>${child.textContent}</p>`;
      }
    }
  }

  flushHtml();
  return segments;
}

export function NoteContentRenderer({
  body,
  className = '',
}: {
  body: string;
  className?: string;
}) {
  const parsed = useMemo(() => parseNoteContent(body), [body]);
  const [lightboxImage, setLightboxImage] = useState<{src: string; caption?: string} | null>(
    null
  );

  const segments = useMemo(() => {
    if (!parsed.isRichHtml) return [];
    const safe = sanitizeNoteHtml(parsed.html);
    return splitHtmlAndMedia(safe);
  }, [parsed]);

  useEffect(() => {
    if (!lightboxImage) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxImage(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxImage]);

  if (!body?.trim()) return null;

  if (!parsed.isRichHtml) {
    return (
      <div
        className={`whitespace-pre-line text-base leading-[1.75] text-slate-700 ${className}`}
      >
        {body}
      </div>
    );
  }

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const img = target as HTMLImageElement;
      const src = img.getAttribute('src');
      if (!src) return;
      const figCaption = img
        .closest('figure')
        ?.querySelector('figcaption')
        ?.textContent?.trim();
      setLightboxImage({
        src,
        caption: figCaption || img.getAttribute('alt') || undefined,
      });
    }
  };

  return (
    <>
      <div
        onClick={handleContentClick}
        className={`iknow-rich-content iknow-tpl-${parsed.templateId} ${className}`}
      >
        {segments.map((seg, idx) =>
          seg.type === 'video' ? (
            <InlineNoteVideoPlayer
              key={`vid-${idx}`}
              src={seg.src}
              caption={seg.caption}
              align={seg.align}
              width={seg.width}
            />
          ) : seg.type === 'audio' ? (
            <InlineNoteAudioPlayer
              key={`aud-${idx}`}
              src={seg.src}
              caption={seg.caption}
              align={seg.align}
              width={seg.width}
            />
          ) : (
            <div
              key={`html-${idx}`}
              className="overflow-x-auto"
              dangerouslySetInnerHTML={{__html: seg.html}}
            />
          )
        )}
      </div>

      {/* Mod Pratonton Gambar Skrin Penuh (Lightbox) */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 p-4 sm:p-8"
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            aria-label="Tutup paparan gambar"
            className="absolute right-4 top-4 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-700 bg-slate-900/90 text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] max-w-5xl flex-col items-center gap-3"
          >
            <img
              src={lightboxImage.src}
              alt={lightboxImage.caption || 'Paparan penuh gambar'}
              className="max-h-[76vh] max-w-full rounded-xl object-contain"
            />
            {lightboxImage.caption && (
              <p className="text-center text-sm text-slate-200 max-w-2xl">
                {lightboxImage.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
