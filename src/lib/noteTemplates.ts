export type NoteTemplateId =
  | 'standard'
  | 'illustrated'
  | 'step-by-step'
  | 'infographic'
  | 'summary'
  | 'interactive';

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
    name: 'Nota Pembelajaran Biasa',
    subtitle: 'Struktur tajuk, pengenalan, poin utama dan rumusan.',
    badge: 'Standard',
    starterHtml: `<h2>Pengenalan Topik</h2>
<p>Tulis pengenalan ringkas tentang konsep asas topik ini untuk membantu pelajar memahami gambaran keseluruhan.</p>
<h3>Isi Penting</h3>
<ul>
  <li>Poin utama pertama beserta huraian ringkas.</li>
  <li>Poin utama kedua dengan contoh amalan harian.</li>
  <li>Poin utama ketiga untuk pengukuhan kefahaman.</li>
</ul>
<blockquote><strong>Rumusan:</strong> Nyatakan kesimpulan atau nilai penghayatan utama daripada topik ini.</blockquote>`,
  },
  {
    id: 'illustrated',
    name: 'Nota Bergambar',
    subtitle: 'Susun atur visual dengan ruang gambar ilustrasi & kapsyen.',
    badge: 'Visual',
    starterHtml: `<h2>Panduan Visual &amp; Ilustrasi</h2>
<p>Gunakan butang <strong>INSERT IMAGE</strong> pada toolbar di atas untuk memuat naik gambar rajah, poster atau foto panduan terus ke bahagian ini.</p>
<div class="iknow-callout"><strong>Tip Penyunting:</strong> Klik pada gambar selepas dimuat naik untuk melaraskan saiz (25%–100%), penjajaran (kiri/tengah/kanan) dan kapsyen gambar.</div>
<h3>Huraian Gambar Rajah</h3>
<p>Terangkan langkah, kedudukan anggota, atau tanda bacaan yang ditunjukkan dalam gambar di atas.</p>`,
  },
  {
    id: 'step-by-step',
    name: 'Nota Langkah Demi Langkah',
    subtitle: 'Panduan berurutan mengikut tertib daripada langkah 1 hingga akhir.',
    badge: 'Tertib',
    starterHtml: `<h2>Tatacara Pelaksanaan Mengikut Tertib</h2>
<p>Ikuti langkah-langkah berikut secara teratur:</p>
<ol>
  <li><strong>Langkah 1 — Persediaan:</strong> Pastikan niat, kebersihan dan syarat dipenuhi sebelum bermula.</li>
  <li><strong>Langkah 2 — Pelaksanaan Utama:</strong> Lakukan pergerakan atau bacaan dengan tenang dan tertib.</li>
  <li><strong>Langkah 3 — Semakan &amp; Penutup:</strong> Semak kesempurnaan rukun serta adab penutup.</li>
</ol>
<div class="iknow-callout"><strong>Peringatan Penting:</strong> Elakkan tergesa-gesa bagi menjaga kesempurnaan ibadah dan bacaan.</div>`,
  },
  {
    id: 'infographic',
    name: 'Nota Berbentuk Infografik',
    subtitle: 'Susun atur jadual perbandingan, fakta utama dan kad ringkas.',
    badge: 'Infografik',
    starterHtml: `<h2>Infografik Ringkas &amp; Perbandingan</h2>
<p>Ringkasan visual bagi memudahkan pelajar membandingkan hukum, kategori atau pembahagian utama:</p>
<table>
  <thead>
    <tr>
      <th>Kategori / Hukum</th>
      <th>Ciri Utama</th>
      <th>Contoh / Amalan</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Bahagian A</strong></td>
      <td>Nyatakan syarat atau huruf berkaitan</td>
      <td>Masukkan contoh ringkas</td>
    </tr>
    <tr>
      <td><strong>Bahagian B</strong></td>
      <td>Nyatakan perbezaan utama</td>
      <td>Masukkan contoh ringkas</td>
    </tr>
    <tr>
      <td><strong>Bahagian C</strong></td>
      <td>Nyatakan kadar atau hukum</td>
      <td>Masukkan contoh ringkas</td>
    </tr>
  </tbody>
</table>
<blockquote><strong>Fakta Pantas:</strong> Gunakan jadual di atas untuk meringkaskan fakta yang sering disoal dalam penilaian.</blockquote>`,
  },
  {
    id: 'summary',
    name: 'Nota Ringkasan',
    subtitle: 'Ulang kaji pantas berisi kata kunci dan intipati padat.',
    badge: 'Ulang Kaji',
    starterHtml: `<h2>Ringkasan Pantas Topik</h2>
<ul>
  <li><strong>Definisi Ringkas:</strong> Nyatakan maksud utama dalam satu atau dua ayat.</li>
  <li><strong>Syarat &amp; Rukun:</strong> Senaraikan perkara asas yang wajib dipatuhi.</li>
  <li><strong>Kesilapan Lazim:</strong> Nyatakan perkara yang perlu dielakkan oleh pelajar.</li>
</ul>
<h3>Jadual Kata Kunci</h3>
<table>
  <thead>
    <tr>
      <th>Istilah</th>
      <th>Maksud Ringkas</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Istilah 1</td>
      <td>Penerangan padat untuk ingatan pantas</td>
    </tr>
    <tr>
      <td>Istilah 2</td>
      <td>Penerangan padat untuk ingatan pantas</td>
    </tr>
  </tbody>
</table>`,
  },
  {
    id: 'interactive',
    name: 'Nota Interaktif',
    subtitle: 'Dilengkapi soalan semak jawapan boleh-buka & senarai semak kendiri.',
    badge: 'Interaktif',
    starterHtml: `<h2>Aktiviti &amp; Semak Kefahaman</h2>
<p>Klik pada soalan di bawah untuk menyemak jawapan dan penerangan selepas anda berfikir terlebih dahulu:</p>
<details>
  <summary>Soalan 1: Apakah perkara utama yang perlu diberi perhatian dalam topik ini?</summary>
  <p><strong>Jawapan &amp; Penjelasan:</strong> Tulis jawapan lengkap dan penjelasan terperinci di sini untuk disemak oleh pelajar.</p>
</details>
<details>
  <summary>Soalan 2: Bagaimanakah cara mengamalkan ilmu ini dengan betul?</summary>
  <p><strong>Jawapan &amp; Penjelasan:</strong> Berikan contoh situasi praktikal supaya pelajar dapat menghayatinya.</p>
</details>
<h3>Senarai Semak Kendiri Pelajar</h3>
<ul>
  <li>Saya telah memahami konsep asas topik ini.</li>
  <li>Saya telah membaca contoh dan menonton media panduan yang disediakan.</li>
  <li>Saya bersedia untuk menjawab kuiz penilaian topik.</li>
</ul>`,
  },
];

export const CONTENT_BODY_MAX_LENGTH = 8000;

export function getTemplateById(id: NoteTemplateId): NoteTemplateDefinition {
  return NOTE_TEMPLATES.find((t) => t.id === id) ?? NOTE_TEMPLATES[0];
}

export interface ParsedNoteContent {
  isRichHtml: boolean;
  templateId: NoteTemplateId;
  html: string;
  plainText: string;
}

const VALID_TEMPLATE_IDS = new Set<NoteTemplateId>([
  'standard',
  'illustrated',
  'step-by-step',
  'infographic',
  'summary',
  'interactive',
]);

export function parseNoteContent(rawBody: string | null | undefined): ParsedNoteContent {
  const body = (rawBody ?? '').trim();
  if (!body) {
    return {
      isRichHtml: false,
      templateId: 'standard',
      html: '',
      plainText: '',
    };
  }

  // Semak sama ada body mempunyai pembalut template I-KNOW
  const wrapperMatch = body.match(
    /^<div\s+data-iknow-tpl="([a-z-]+)"[^>]*>([\s\S]*)<\/div>$/i
  );
  if (wrapperMatch) {
    const rawTpl = wrapperMatch[1] as NoteTemplateId;
    const templateId = VALID_TEMPLATE_IDS.has(rawTpl) ? rawTpl : 'standard';
    return {
      isRichHtml: true,
      templateId,
      html: wrapperMatch[2].trim(),
      plainText: stripHtmlToText(wrapperMatch[2]),
    };
  }

  // Semak jika mengandungi tag HTML kaya daripada penyuntingan terus
  const looksLikeHtml = /<(p|h[1-4]|ul|ol|li|table|figure|img|video|div|blockquote|details|strong|em)\b/i.test(
    body
  );
  if (looksLikeHtml) {
    return {
      isRichHtml: true,
      templateId: 'standard',
      html: body,
      plainText: stripHtmlToText(body),
    };
  }

  // Nota teks biasa lama (keserasian penuh dengan rekod sedia ada)
  return {
    isRichHtml: false,
    templateId: 'standard',
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
  'width',
  'max-width',
  'font-weight',
  'font-style',
  'text-decoration',
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

        if (name === 'src') {
          if (!isSafeHttpUrl(val)) {
            el.removeAttribute('src');
          }
          continue;
        }

        const allowedAttr =
          name === 'alt' ||
          name === 'title' ||
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
  templateId: NoteTemplateId
): string {
  const sanitized = sanitizeNoteHtml(html);
  // Padatkan whitespace antara tag supaya lebih jimat ruang dalam had 8000 aksara Firestore
  const compacted = sanitized
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!compacted) return '';
  return `<div data-iknow-tpl="${templateId}">${compacted}</div>`;
}
