import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Maximize2, Pause, Play, Volume2, VolumeX} from 'lucide-react';
import {parseNoteContent, sanitizeNoteHtml} from '../../lib/noteTemplates';

interface VideoSegment {
  type: 'video';
  src: string;
  caption?: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface HtmlSegment {
  type: 'html';
  html: string;
}

type ContentSegment = HtmlSegment | VideoSegment;

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
    <figure className={`my-4 flex flex-col gap-1.5 ${alignClass}`}>
      <div
        ref={containerRef}
        style={{width: width || '100%', maxWidth: '100%'}}
        className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950"
      >
        <video
          ref={videoRef}
          src={src}
          controls
          playsInline
          preload="metadata"
          className="max-h-[460px] w-full bg-slate-950"
        >
          Pelayar anda tidak menyokong pemain video terbina dalam.
        </video>
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200">
          <button
            type="button"
            onClick={togglePlay}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-2.5 py-1 font-semibold text-white hover:bg-emerald-600"
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
            className="h-1.5 flex-1 min-w-[90px] accent-emerald-500 cursor-pointer"
          />

          <span className="font-mono-tabular text-[11px] text-slate-300">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>

          <button
            type="button"
            onClick={toggleMute}
            title={muted ? 'Nyahsenyap' : 'Senyap'}
            className="rounded-md border border-slate-700 p-1.5 text-slate-200 hover:bg-slate-800"
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleFullscreen}
            title="Skrin Penuh"
            className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-slate-200 hover:bg-slate-800"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Skrin Penuh</span>
          </button>
        </div>
      </div>
      {caption && (
        <figcaption className="text-xs italic text-slate-500 text-center">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function splitHtmlAndVideos(sanitizedHtml: string): ContentSegment[] {
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
        const src = videoEl?.getAttribute('src') || videoEl?.querySelector('source')?.getAttribute('src') || '';
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

  const segments = useMemo(() => {
    if (!parsed.isRichHtml) return [];
    const safe = sanitizeNoteHtml(parsed.html);
    return splitHtmlAndVideos(safe);
  }, [parsed]);

  if (!body?.trim()) return null;

  if (!parsed.isRichHtml) {
    return (
      <div className={`whitespace-pre-line text-sm leading-relaxed text-slate-700 ${className}`}>
        {body}
      </div>
    );
  }

  return (
    <div
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
        ) : (
          <div
            key={`html-${idx}`}
            className="overflow-x-auto"
            dangerouslySetInnerHTML={{__html: seg.html}}
          />
        )
      )}
    </div>
  );
}
