export type NoteTemplateId =
  | 'standard'
  | 'dalil'
  | 'visual'
  | 'multimedia'
  | 'step-by-step'
  | 'summary';

export type DalilKind = 'general' | 'quran' | 'hadith';

export interface NoteTemplateDefinition {
  id: NoteTemplateId;
  name: string;
  subtitle: string;
  badge: string;
  starterHtml: string;
}

export const NOTE_TEMPLATES: NoteTemplateDefinition[] = [
  {
    id: 'standard',
    name: 'Nota Standard',
    subtitle: 'Penerangan, definisi dan konsep asas secara teratur dan mudah difahami.',
    badge: 'Standard',
    starterHtml: `<h2>Definisi &amp; Konsep Asas</h2>
<p>Tulis penerangan utama atau definisi topik dengan ayat yang ringkas, jelas dan mesra pelajar.</p>
<h3>Huraian Konsep Utama</h3>
<ul>
  <li><strong>Poin Pertama:</strong> Penerangan ringkas beserta konteks amalan seharian.</li>
  <li><strong>Poin Kedua:</strong> Penekanan hukum atau adab yang perlu diberi perhatian.</li>
  <li><strong>Poin Ketiga:</strong> Contoh praktikal bagi mengukuhkan kefahaman pelajar.</li>
</ul>
<blockquote><strong>Rumusan Pembelajaran:</strong> Nyatakan kesimpulan utama yang perlu diingati oleh pelajar selepas membaca nota ini.</blockquote>`,
  },
  {
    id: 'dalil',
    name: 'Nota Dalil',
    subtitle: 'Susun atur ayat al-Quran, hadis, terjemahan serta huraian pengajaran.',
    badge: 'Dalil',
    starterHtml: `<h2>Dalil Naqli &amp; Huraian</h2>
<p>Kemukakan dalil daripada al-Quran atau Hadis Nabi SAW yang berkaitan dengan topik ini. Anda juga boleh mengisi kotak <strong>Medan Dalil &amp; Lafaz Arab</strong> di bawah editor untuk paparan kad khas krim lembut.</p>
<p dir="rtl" style="font-family: Amiri, serif; font-size: 22px; text-align: right;">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
<div class="iknow-callout"><strong>Terjemahan:</strong> Masukkan terjemahan ayat al-Quran atau matan hadis secara tepat beserta sumber rujukan (Surah &amp; ayat atau perawi hadis).</div>
<h3>Huraian &amp; Pengajaran Dalil</h3>
<ul>
  <li><strong>Intipati Hukum / Pengajaran:</strong> Terangkan maksud dalil dan kaitannya dengan amalan ibadah.</li>
  <li><strong>Aplikasi Amali:</strong> Nyatakan cara pelajar mengamalkannya dalam kehidupan harian.</li>
</ul>`,
  },
  {
    id: 'visual',
    name: 'Nota Visual',
    subtitle: 'Susun atur bergambar, rajah, jadual infografik dan penerangan ringkas.',
    badge: 'Visual',
    starterHtml: `<h2>Rajah Visual &amp; Infografik</h2>
<p>Gunakan butang <strong>INSERT IMAGE</strong> di atas untuk memuat naik gambar rajah, poster atau ilustrasi panduan terus daripada peranti anda.</p>
<div class="iknow-callout"><strong>Tip Penyunting:</strong> Klik pada gambar selepas dimuat naik untuk melaraskan saiz (25%–100%), kedudukan (kiri/tengah/kanan) dan kapsyen gambar.</div>
<h3>Jadual Perbandingan Pantas</h3>
<table>
  <thead>
    <tr>
      <th>Perkara / Bahagian</th>
      <th>Ciri Utama</th>
      <th>Contoh / Kadar</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Bahagian A</strong></td>
      <td>Nyatakan ciri atau syarat penting</td>
      <td>Contoh ringkas</td>
    </tr>
    <tr>
      <td><strong>Bahagian B</strong></td>
      <td>Nyatakan perbezaan atau hukum</td>
      <td>Contoh ringkas</td>
    </tr>
  </tbody>
</table>`,
  },
  {
    id: 'multimedia',
    name: 'Nota Multimedia',
    subtitle: 'Gabungan teks penerangan, gambar ilustrasi, video demonstrasi dan audio bacaan.',
    badge: 'Multimedia',
    starterHtml: `<h2>Panduan Multimedia Interaktif</h2>
<p>Gabungkan teks penerangan bersama media pembelajaran menggunakan butang <strong>INSERT IMAGE</strong>, <strong>INSERT VIDEO</strong> dan <strong>INSERT AUDIO</strong> pada toolbar editor.</p>
<h3>1. Penerangan &amp; Demonstrasi Visual</h3>
<p>Sisipkan gambar rajah atau video demonstrasi (MP4/WEBM) di sini supaya pelajar dapat menonton terus di dalam halaman nota.</p>
<h3>2. Rakaman Audio Bacaan / Sebutan</h3>
<p>Sisipkan fail audio (MP3/WAV/M4A) untuk bacaan contoh, lafaz niat atau sebutan makhraj huruf yang betul.</p>
<blockquote><strong>Panduan Pelajar:</strong> Dengar audio dan tonton video dengan teliti sambil mengikuti teks panduan yang disediakan.</blockquote>`,
  },
  {
    id: 'step-by-step',
    name: 'Nota Langkah demi Langkah',
    subtitle: 'Panduan pelaksanaan atau tatacara ibadah mengikut urutan tertib.',
    badge: 'Tatacara',
    starterHtml: `<h2>Tatacara Pelaksanaan Mengikut Tertib</h2>
<p>Ikuti langkah-langkah berikut secara berurutan bagi memastikan amalan dilakukan dengan sempurna:</p>
<ol>
  <li><strong>Langkah 1 — Persediaan Awal:</strong> Pastikan niat yang ikhlas, kebersihan diri dan syarat sah dipenuhi terlebih dahulu.</li>
  <li><strong>Langkah 2 — Pelaksanaan Utama:</strong> Laksanakan pergerakan atau bacaan dengan tenang serta menjaga tuma'ninah.</li>
  <li><strong>Langkah 3 — Semakan &amp; Penutup:</strong> Semak kesempurnaan rukun dan amalkan doa penutup yang disyariatkan.</li>
</ol>
<div class="iknow-callout"><strong>Peringatan Penting:</strong> Lakukan setiap langkah mengikut tertib dan elakkan tergesa-gesa.</div>`,
  },
  {
    id: 'summary',
    name: 'Nota Ringkasan',
    subtitle: 'Isi penting, rumusan pantas dan poin utama untuk ulang kaji.',
    badge: 'Ringkasan',
    starterHtml: `<h2>Ringkasan &amp; Isi Penting Topik</h2>
<ul>
  <li><strong>Konsep Teras:</strong> Nyatakan takrifan atau maksud utama dalam satu ayat padat.</li>
  <li><strong>Syarat &amp; Rukun Utama:</strong> Senaraikan perkara asas yang wajib dipatuhi.</li>
  <li><strong>Kesilapan Lazim:</strong> Nyatakan perkara yang perlu dielakkan oleh pelajar.</li>
</ul>
<h3>Jadual Kata Kunci Ulang Kaji</h3>
<table>
  <thead>
    <tr>
      <th>Istilah / Hukum</th>
      <th>Ringkasan Maksud</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Istilah 1</strong></td>
      <td>Penerangan padat untuk ingatan pantas</td>
    </tr>
    <tr>
      <td><strong>Istilah 2</strong></td>
      <td>Penerangan padat untuk ingatan pantas</td>
    </tr>
  </tbody>
</table>`,
  },
];

export const CONTENT_BODY_MAX_LENGTH = 8000;

export function getTemplateById(id: NoteTemplateId): NoteTemplateDefinition {
  return NOTE_TEMPLATES.find((t) => t.id === id) ?? NOTE_TEMPLATES[0];
}

export interface ParsedNoteContent {
  isRichHtml: boolean;
  templateId: NoteTemplateId;
  dalilKind: DalilKind;
  dalilSource: string;
  html: string;
  plainText: string;
}

const VALID_TEMPLATE_IDS = new Set<NoteTemplateId>([
  'standard',
  'dalil',
  'visual',
  'multimedia',
  'step-by-step',
  'summary',
]);

// Keserasian penuh dengan nota V1 yang mungkin menggunakan ID template terdahulu
const LEGACY_TEMPLATE_MAP: Record<string, NoteTemplateId> = {
  illustrated: 'visual',
  infographic: 'visual',
  interactive: 'standard',
};

function decodeHtmlAttr(val: string): string {
  return val
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function encodeHtmlAttr(val: string): string {
  return val
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function parseNoteContent(rawBody: string | null | undefined): ParsedNoteContent {
  const body = (rawBody ?? '').trim();
  if (!body) {
    return {
      isRichHtml: false,
      templateId: 'standard',
      dalilKind: 'general',
      dalilSource: '',
      html: '',
      plainText: '',
    };
  }

  // Semak sama ada body mempunyai pembalut template I-KNOW
  const wrapperMatch = body.match(
    /^<div\s+([^>]*data-iknow-tpl="([a-z-]+)"[^>]*)>([\s\S]*)<\/div>$/i
  );
  if (wrapperMatch) {
    const attrString = wrapperMatch[1];
    const rawTpl = wrapperMatch[2].toLowerCase();
    const mappedTpl = LEGACY_TEMPLATE_MAP[rawTpl] ?? (rawTpl as NoteTemplateId);
    const templateId = VALID_TEMPLATE_IDS.has(mappedTpl) ? mappedTpl : 'standard';

    const dalilKindMatch = attrString.match(/data-iknow-dalil-kind="(general|quran|hadith)"/i);
    const dalilKind = (dalilKindMatch?.[1]?.toLowerCase() as DalilKind) || 'general';

    const dalilSrcMatch = attrString.match(/data-iknow-dalil-src="([^"]*)"/i);
    const dalilSource = dalilSrcMatch ? decodeHtmlAttr(dalilSrcMatch[1]).trim() : '';

    return {
      isRichHtml: true,
      templateId,
      dalilKind,
      dalilSource,
      html: wrapperMatch[3].trim(),
      plainText: stripHtmlToText(wrapperMatch[3]),
    };
  }

  // Semak jika mengandungi tag HTML kaya daripada penyuntingan terus
  const looksLikeHtml =
    /<(p|h[1-4]|ul|ol|li|table|figure|img|video|audio|div|blockquote|details|strong|em)\b/i.test(
      body
    );
  if (looksLikeHtml) {
    return {
      isRichHtml: true,
      templateId: 'standard',
      dalilKind: 'general',
      dalilSource: '',
      html: body,
      plainText: stripHtmlToText(body),
    };
  }

  // Nota teks biasa lama (keserasian penuh dengan rekod sedia ada)
  return {
    isRichHtml: false,
    templateId: 'standard',
    dalilKind: 'general',
    dalilSource: '',
    html: plainTextToHtml(body),
    plainText: body,
  };
}

export function plainTextToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function stripHtmlToText(html: string): string {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function hasBase64Media(html: string): boolean {
  return /(?:src|href)\s*=\s*["']\s*data:(?:image|video|audio)\//i.test(html);
}

const ALLOWED_TAGS = new Set([
  'P',
  'DIV',
  'SPAN',
  'BR',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'S',
  'STRIKE',
  'SUB',
  'SUP',
  'MARK',
  'H1',
  'H2',
  'H3',
  'H4',
  'UL',
  'OL',
  'LI',
  'BLOCKQUOTE',
  'HR',
  'TABLE',
  'THEAD',
  'TBODY',
  'TR',
  'TH',
  'TD',
  'FIGURE',
  'FIGCAPTION',
  'IMG',
  'VIDEO',
  'AUDIO',
  'SOURCE',
  'DETAILS',
  'SUMMARY',
  'FONT',
]);

const ALLOWED_STYLE_PROPS = new Set([
  'color',
  'background-color',
  'font-family',
  'font-size',
  'text-align',
  'text-justify',
  'line-height',
  'margin-top',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'margin-inline-start',
  'padding-left',
  'padding-right',
  'padding-inline-start',
  'direction',
  'unicode-bidi',
  'width',
  'max-width',
  'font-weight',
  'font-style',
  'text-decoration',
  'vertical-align',
]);

function sanitizeStyleAttribute(rawStyle: string): string {
  return rawStyle
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((rule) => {
      const colonIdx = rule.indexOf(':');
      if (colonIdx === -1) return '';
      const prop = rule.slice(0, colonIdx).trim().toLowerCase();
      const val = rule.slice(colonIdx + 1).trim();
      if (!ALLOWED_STYLE_PROPS.has(prop)) return '';
      if (/url\(|expression\(|javascript:/i.test(val)) return '';
      return `${prop}: ${val}`;
    })
    .filter(Boolean)
    .join('; ');
}

function isSafeHttpUrl(url: string): boolean {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) || trimmed.startsWith('blob:');
}

export function sanitizeNoteHtml(rawHtml: string): string {
  if (!rawHtml.trim()) return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return rawHtml;
  }

  const doc = new DOMParser().parseFromString(rawHtml, 'text/html');

  const cleanNode = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue;

      const el = child as HTMLElement;
      const tag = el.tagName.toUpperCase();

      if (!ALLOWED_TAGS.has(tag)) {
        if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED'].includes(tag)) {
          el.remove();
          continue;
        }
        // Kekalkan kandungan teks bagi tag luar senarai
        const fragment = doc.createDocumentFragment();
        while (el.firstChild) {
          fragment.appendChild(el.firstChild);
        }
        el.replaceWith(fragment);
        cleanNode(node);
        return;
      }

      // Tukar atribut align legasi (jika dijana pelayar) kepada style text-align
      const legacyAlign = el.getAttribute('align')?.trim().toLowerCase();
      if (legacyAlign && ['left', 'center', 'right', 'justify'].includes(legacyAlign)) {
        if (!el.style.textAlign) {
          el.style.textAlign = legacyAlign;
        }
        el.removeAttribute('align');
      }

      // Bersihkan atribut berbahaya
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        const val = attr.value;

        if (name.startsWith('on')) {
          el.removeAttribute(attr.name);
          continue;
        }

        if (name === 'style') {
          const cleaned = sanitizeStyleAttribute(val);
          if (cleaned) el.setAttribute('style', cleaned);
          else el.removeAttribute('style');
          continue;
        }

        if (name === 'class') {
          const safeClasses = val
            .split(/\s+/)
            .filter((c) => c.startsWith('iknow-'))
            .join(' ');
          if (safeClasses) el.setAttribute('class', safeClasses);
          else el.removeAttribute('class');
          continue;
        }

        if (name === 'dir') {
          const norm = val.trim().toLowerCase();
          if (norm === 'rtl' || norm === 'ltr' || norm === 'auto') {
            el.setAttribute('dir', norm);
          } else {
            el.removeAttribute('dir');
          }
          continue;
        }

        if (name === 'src') {
          if (!isSafeHttpUrl(val)) {
            el.removeAttribute('src');
          }
          continue;
        }

        const allowedAttr =
          name === 'alt' ||
          name === 'title' ||
          name === 'lang' ||
          name === 'controls' ||
          name === 'playsinline' ||
          name === 'preload' ||
          name === 'open' ||
          name === 'colspan' ||
          name === 'rowspan' ||
          name === 'type' ||
          name === 'color' ||
          name === 'face' ||
          name === 'size' ||
          name.startsWith('data-iknow-') ||
          name === 'data-storage-path' ||
          name === 'data-align' ||
          name === 'data-width';

        if (!allowedAttr) {
          el.removeAttribute(attr.name);
        }
      }

      if (tag === 'VIDEO') {
        el.setAttribute('controls', '');
        el.setAttribute('playsinline', '');
        if (!el.getAttribute('preload')) {
          el.setAttribute('preload', 'metadata');
        }
      }

      if (tag === 'AUDIO') {
        el.setAttribute('controls', '');
        if (!el.getAttribute('preload')) {
          el.setAttribute('preload', 'metadata');
        }
      }

      if (tag === 'IMG') {
        if (!el.getAttribute('src')) {
          el.remove();
          continue;
        }
      }

      cleanNode(el);
    }
  };

  cleanNode(doc.body);
  return doc.body.innerHTML.trim();
}

export function serializeNoteContent(
  html: string,
  templateId: NoteTemplateId,
  dalilMeta?: {
    dalilKind?: DalilKind;
    dalilSource?: string;
  }
): string {
  const sanitized = sanitizeNoteHtml(html);
  // Padatkan whitespace antara tag supaya lebih jimat ruang dalam had 8000 aksara Firestore
  // Kekalkan aksara unikod Arab/Jawi serta tanda bacaan/harakat sepenuhnya
  const compacted = sanitized
    .replace(/>\s+</g, '><')
    .replace(/[ \t\r\n]{2,}/g, ' ')
    .trim();
  const kind = dalilMeta?.dalilKind && dalilMeta.dalilKind !== 'general' ? dalilMeta.dalilKind : '';
  const src = dalilMeta?.dalilSource?.trim() ? encodeHtmlAttr(dalilMeta.dalilSource.trim().slice(0, 180)) : '';

  if (!compacted && !kind && !src) return '';

  const attrs = [
    `data-iknow-tpl="${templateId}"`,
    kind ? `data-iknow-dalil-kind="${kind}"` : '',
    src ? `data-iknow-dalil-src="${src}"` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return `<div ${attrs}>${compacted}</div>`;
}
