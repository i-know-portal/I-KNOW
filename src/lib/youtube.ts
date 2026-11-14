export function extractYoutubeId(rawUrl: string): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  try {
    const url = new URL(trimmed);
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.replace('/', '').split('/')[0];
      return id && /^[a-zA-Z0-9_-]{6,15}$/.test(id) ? id : null;
    }
    if (
      url.hostname === 'www.youtube.com' ||
      url.hostname === 'youtube.com' ||
      url.hostname === 'm.youtube.com' ||
      url.hostname === 'www.youtube-nocookie.com'
    ) {
      if (url.pathname.startsWith('/embed/')) {
        const id = url.pathname.replace('/embed/', '').split('/')[0];
        return id && /^[a-zA-Z0-9_-]{6,15}$/.test(id) ? id : null;
      }
      if (url.pathname.startsWith('/shorts/')) {
        const id = url.pathname.replace('/shorts/', '').split('/')[0];
        return id && /^[a-zA-Z0-9_-]{6,15}$/.test(id) ? id : null;
      }
      const v = url.searchParams.get('v');
      return v && /^[a-zA-Z0-9_-]{6,15}$/.test(v) ? v : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function getYoutubeEmbedUrl(rawUrl: string): string | null {
  const id = extractYoutubeId(rawUrl);
  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let idx = 0;
  let value = bytes;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export function formatMalayDate(iso: string | null | undefined): string {
  if (!iso) return 'Belum direkodkan';
  try {
    return new Intl.DateTimeFormat('ms-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
