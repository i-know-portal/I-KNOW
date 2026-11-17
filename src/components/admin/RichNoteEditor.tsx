import React, {useCallback, useEffect, useRef, useState} from 'react';
import type {UploadTask} from 'firebase/storage';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  Columns,
  Eye,
  FileText,
  Film,
  Headphones,
  Highlighter,
  ImagePlus,
  Italic,
  Languages,
  LayoutTemplate,
  List,
  ListOrdered,
  Loader2,
  Maximize2,
  Palette,
  Pause,
  Play,
  Plus,
  Redo2,
  RefreshCw,
  Rows,
  Table2,
  Trash2,
  Underline,
  Undo2,
  Video,
  X,
} from 'lucide-react';
import {
  CONTENT_BODY_MAX_LENGTH,
  getTemplateById,
  NOTE_TEMPLATES,
  serializeNoteContent,
  type NoteTemplateDefinition,
  type NoteTemplateId,
} from '../../lib/noteTemplates';
import {formatBytes} from '../../lib/youtube';
import {
  uploadNoteAudio,
  uploadNoteImage,
  uploadNoteVideo,
  type UploadProgressInfo,
} from '../../services/storageService';
import {NoteContentRenderer} from '../common/NoteContentRenderer';

interface RichNoteEditorProps {
  topicId: string;
  valueHtml: string;
  templateId: NoteTemplateId;
  showTemplatePickerInitially?: boolean;
  onChange: (nextHtml: string, nextTemplateId: NoteTemplateId) => void;
}

interface SelectedMediaState {
  kind: 'image' | 'video' | 'audio';
  figure: HTMLElement;
  src: string;
  widthPercent: number;
  align: 'left' | 'center' | 'right';
  caption: string;
}

const FONT_FAMILIES = [
  {label: 'Lalai (Plus Jakarta Sans)', value: 'Plus Jakarta Sans, sans-serif'},
  {label: 'Amiri (Tulisan Arab)', value: 'Amiri, serif'},
  {label: 'Serif (Georgia)', value: 'Georgia, serif'},
  {label: 'Sans (Arial)', value: 'Arial, sans-serif'},
  {label: 'Monospace (JetBrains Mono)', value: 'JetBrains Mono, monospace'},
];

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px'];

const TEXT_COLORS = [
  {label: 'Gelap', value: '#0f172a'},
  {label: 'Hijau I-KNOW', value: '#064e3b'},
  {label: 'Zamrud', value: '#047857'},
  {label: 'Emas', value: '#b45309'},
  {label: 'Biru', value: '#1d4ed8'},
  {label: 'Merah', value: '#b91c1c'},
];

const HIGHLIGHT_COLORS = [
  {label: 'Tiada', value: 'transparent'},
  {label: 'Krim Lembut', value: '#fbf7ee'},
  {label: 'Kuning Lembut', value: '#fef08a'},
  {label: 'Hijau Lembut', value: '#bbf7d0'},
  {label: 'Biru Lembut', value: '#bfdbfe'},
  {label: 'Merah Lembut', value: '#fecaca'},
];

function parsePercentWidth(raw: string | null | undefined, fallback: number): number {
  if (!raw) return fallback;
  const num = parseInt(raw.replace('%', '').trim(), 10);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(20, Math.min(100, num));
}

export function RichNoteEditor({
  topicId,
  valueHtml,
  templateId,
  showTemplatePickerInitially = true,
  onChange,
}: RichNoteEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const replaceImageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const replaceVideoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const replaceAudioInputRef = useRef<HTMLInputElement>(null);
  const activeUploadTaskRef = useRef<UploadTask | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const previewVideoBoxRef = useRef<HTMLDivElement>(null);

  // Sejarah Undo / Redo tersuai
  const historyRef = useRef<string[]>([valueHtml]);
  const historyIndexRef = useRef<number>(0);
  const isInternalSyncRef = useRef(false);

  const [showTemplates, setShowTemplates] = useState(showTemplatePickerInitially);
  const [pendingTemplateId, setPendingTemplateId] = useState<NoteTemplateId | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<NoteTemplateDefinition | null>(null);

  // Keadaan format aktif pada toolbar
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    ul: false,
    ol: false,
    left: false,
    center: false,
    right: false,
    rtl: false,
    block: 'p',
  });
  const [insideTable, setInsideTable] = useState(false);

  // Popover jadual & warna
  const [tablePopoverOpen, setTablePopoverOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableHasHeader, setTableHasHeader] = useState(true);
  const [textColorOpen, setTextColorOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);

  // Keadaan muat naik media ke Firebase Storage
  const [uploadingKind, setUploadingKind] = useState<'image' | 'video' | 'audio' | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressInfo | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Drawer pratonton video sebelum dimasukkan
  const [videoDrawerOpen, setVideoDrawerOpen] = useState(false);
  const [stagedVideo, setStagedVideo] = useState<{
    url: string;
    storagePath: string;
    fileName: string;
    sizeBytes: number;
    caption: string;
  } | null>(null);
  const [previewVideoPlaying, setPreviewVideoPlaying] = useState(false);

  // Drawer muat naik & pratonton audio sebelum dimasukkan
  const [audioDrawerOpen, setAudioDrawerOpen] = useState(false);
  const [stagedAudio, setStagedAudio] = useState<{
    url: string;
    storagePath: string;
    fileName: string;
    sizeBytes: number;
    caption: string;
  } | null>(null);

  // Pratonton gambar penuh sebelum diterbitkan
  const [imagePreviewModal, setImagePreviewModal] = useState<{
    src: string;
    caption: string;
  } | null>(null);

  // Media yang sedang dipilih dalam editor
  const [selectedMedia, setSelectedMedia] = useState<SelectedMediaState | null>(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateUndoRedoFlags = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  const pushHistory = useCallback(
    (html: string) => {
      const current = historyRef.current[historyIndexRef.current];
      if (current === html) return;
      const sliced = historyRef.current.slice(0, historyIndexRef.current + 1);
      sliced.push(html);
      if (sliced.length > 60) sliced.shift();
      historyRef.current = sliced;
      historyIndexRef.current = sliced.length - 1;
      updateUndoRedoFlags();
    },
    [updateUndoRedoFlags]
  );

  // Segerakkan kandungan apabila nota yang diedit bertukar dari luar
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (isInternalSyncRef.current) {
      isInternalSyncRef.current = false;
      return;
    }
    if (el.innerHTML !== valueHtml) {
      el.innerHTML = valueHtml || '<p><br></p>';
      historyRef.current = [valueHtml || '<p><br></p>'];
      historyIndexRef.current = 0;
      updateUndoRedoFlags();
      setSelectedMedia(null);
    }
  }, [valueHtml, updateUndoRedoFlags]);

  useEffect(() => {
    setShowTemplates(showTemplatePickerInitially);
  }, [showTemplatePickerInitially]);

  const emitEditorChange = useCallback(
    (recordHistory = true, overrideTemplate?: NoteTemplateId) => {
      const el = editorRef.current;
      if (!el) return;
      // Jangan simpan atribut data-iknow-selected ke dalam HTML yang disimpan
      const clone = el.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('[data-iknow-selected]').forEach((node) => {
        node.removeAttribute('data-iknow-selected');
      });
      const cleanHtml = clone.innerHTML;
      if (recordHistory) {
        pushHistory(cleanHtml);
      }
      isInternalSyncRef.current = true;
      onChange(cleanHtml, overrideTemplate ?? templateId);
    },
    [onChange, pushHistory, templateId]
  );

  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return;
    const range = sel.getRangeAt(0);
    if (editorRef.current.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel) return;
    if (savedRangeRef.current && el.contains(savedRangeRef.current.commonAncestorContainer)) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  }, []);

  const refreshActiveFormats = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !editorRef.current) return;
    let isRtl = false;
    if (sel.rangeCount > 0) {
      const node = sel.getRangeAt(0).commonAncestorContainer;
      if (!editorRef.current.contains(node)) return;
      const elem = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
      setInsideTable(Boolean(elem?.closest('table')));
      const dirBlock = elem?.closest('[dir]') as HTMLElement | null;
      isRtl = dirBlock?.getAttribute('dir')?.toLowerCase() === 'rtl';
    }
    try {
      const blockVal = String(document.queryCommandValue('formatBlock') || 'p')
        .replace(/[<>]/g, '')
        .toLowerCase();
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        ul: document.queryCommandState('insertUnorderedList'),
        ol: document.queryCommandState('insertOrderedList'),
        left: document.queryCommandState('justifyLeft'),
        center: document.queryCommandState('justifyCenter'),
        right: document.queryCommandState('justifyRight'),
        rtl: isRtl,
        block: ['h1', 'h2', 'h3', 'p'].includes(blockVal) ? blockVal : 'p',
      });
    } catch {
      setActiveFormats((prev) => ({...prev, rtl: isRtl}));
    }
  }, []);

  useEffect(() => {
    const onSelectionChange = () => {
      saveSelection();
      refreshActiveFormats();
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [refreshActiveFormats, saveSelection]);

  const execCmd = (command: string, value?: string) => {
    restoreSelection();
    document.execCommand(command, false, value);
    saveSelection();
    refreshActiveFormats();
    emitEditorChange(true);
  };

  // Pemformatan Tulisan Arab & Arah RTL / LTR
  const handleSetDirection = (dir: 'rtl' | 'ltr') => {
    const root = editorRef.current;
    if (!root) return;
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const node = range.commonAncestorContainer;
    const elem = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
    const blockEl = elem?.closest('p, div, h1, h2, h3, li, blockquote, td, th') as HTMLElement | null;

    if (blockEl && blockEl !== root && root.contains(blockEl)) {
      if (dir === 'rtl') {
        blockEl.setAttribute('dir', 'rtl');
        blockEl.style.direction = 'rtl';
        blockEl.style.textAlign = 'right';
        if (!blockEl.style.fontFamily) {
          blockEl.style.fontFamily = 'Amiri, serif';
        }
      } else {
        blockEl.setAttribute('dir', 'ltr');
        blockEl.style.direction = 'ltr';
        blockEl.style.textAlign = 'left';
        if (blockEl.style.fontFamily.includes('Amiri')) {
          blockEl.style.fontFamily = 'Plus Jakarta Sans, sans-serif';
        }
      }
    } else if (!range.collapsed) {
      const span = document.createElement('span');
      span.setAttribute('dir', dir);
      span.style.direction = dir;
      if (dir === 'rtl') {
        span.style.fontFamily = 'Amiri, serif';
        span.style.fontSize = '22px';
      }
      try {
        range.surroundContents(span);
      } catch {
        const frag = range.extractContents();
        span.appendChild(frag);
        range.insertNode(span);
      }
    } else {
      const p = document.createElement('p');
      p.setAttribute('dir', dir);
      p.style.direction = dir;
      p.style.textAlign = dir === 'rtl' ? 'right' : 'left';
      if (dir === 'rtl') {
        p.style.fontFamily = 'Amiri, serif';
        p.style.fontSize = '22px';
        p.textContent = 'اكتب النص العربي هنا';
      } else {
        p.innerHTML = '<br>';
      }
      root.appendChild(p);
    }

    saveSelection();
    refreshActiveFormats();
    emitEditorChange(true);
  };

  const handleApplyFontSize = (sizePx: string) => {
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) {
      const span = document.createElement('span');
      span.style.fontSize = sizePx;
      span.innerHTML = '&#8203;';
      range.insertNode(span);
      range.setStart(span.firstChild!, 1);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      const span = document.createElement('span');
      span.style.fontSize = sizePx;
      try {
        range.surroundContents(span);
      } catch {
        const frag = range.extractContents();
        span.appendChild(frag);
        range.insertNode(span);
      }
      sel.removeAllRanges();
      const nextRange = document.createRange();
      nextRange.selectNodeContents(span);
      sel.addRange(nextRange);
    }
    saveSelection();
    emitEditorChange(true);
  };

  const handleApplyFontFamily = (fontFamily: string) => {
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) {
      document.execCommand('fontName', false, fontFamily);
    } else {
      const span = document.createElement('span');
      span.style.fontFamily = fontFamily;
      try {
        range.surroundContents(span);
      } catch {
        document.execCommand('fontName', false, fontFamily);
      }
    }
    saveSelection();
    emitEditorChange(true);
  };

  const handleUndo = () => {
    if (historyIndexRef.current <= 0 || !editorRef.current) return;
    historyIndexRef.current -= 1;
    const html = historyRef.current[historyIndexRef.current] ?? '<p><br></p>';
    editorRef.current.innerHTML = html;
    setSelectedMedia(null);
    updateUndoRedoFlags();
    isInternalSyncRef.current = true;
    onChange(html, templateId);
  };

  const handleRedo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1 || !editorRef.current) return;
    historyIndexRef.current += 1;
    const html = historyRef.current[historyIndexRef.current] ?? '<p><br></p>';
    editorRef.current.innerHTML = html;
    setSelectedMedia(null);
    updateUndoRedoFlags();
    isInternalSyncRef.current = true;
    onChange(html, templateId);
  };

  const insertHtmlAtCursor = useCallback(
    (htmlSnippet: string) => {
      const el = editorRef.current;
      if (!el) return;
      restoreSelection();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && el.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const temp = document.createElement('div');
        temp.innerHTML = htmlSnippet;
        const frag = document.createDocumentFragment();
        let lastNode: Node | null = null;
        while (temp.firstChild) {
          lastNode = frag.appendChild(temp.firstChild);
        }
        range.insertNode(frag);
        if (lastNode) {
          const nextRange = document.createRange();
          nextRange.setStartAfter(lastNode);
          nextRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(nextRange);
        }
      } else {
        el.insertAdjacentHTML('beforeend', htmlSnippet);
      }
      saveSelection();
      emitEditorChange(true);
    },
    [emitEditorChange, restoreSelection, saveSelection]
  );

  // Terapkan atau tukar template nota
  const applyTemplate = (nextId: NoteTemplateId, force = false) => {
    const el = editorRef.current;
    const currentText = (el?.textContent ?? '').trim();
    const hasMedia = Boolean(el?.querySelector('img, video, audio, table'));

    if (!force && (currentText.length > 0 || hasMedia)) {
      setPendingTemplateId(nextId);
      return;
    }

    const tpl = getTemplateById(nextId);
    if (el) {
      el.innerHTML = tpl.starterHtml;
    }
    setPendingTemplateId(null);
    setPreviewTemplate(null);
    setSelectedMedia(null);
    setShowTemplates(false);
    pushHistory(tpl.starterHtml);
    isInternalSyncRef.current = true;
    onChange(tpl.starterHtml, nextId);
  };

  // Sisipan Jadual
  const handleInsertTable = () => {
    const r = Math.max(1, Math.min(10, tableRows));
    const c = Math.max(1, Math.min(8, tableCols));
    let html = '<table>';
    if (tableHasHeader) {
      html += '<thead><tr>';
      for (let j = 0; j < c; j += 1) {
        html += `<th>Tajuk ${j + 1}</th>`;
      }
      html += '</tr></thead>';
    }
    html += '<tbody>';
    const bodyRows = tableHasHeader ? Math.max(1, r - 1) : r;
    for (let i = 0; i < bodyRows; i += 1) {
      html += '<tr>';
      for (let j = 0; j < c; j += 1) {
        html += '<td>Isi kandungan</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';
    insertHtmlAtCursor(html);
    setTablePopoverOpen(false);
  };

  const handleTableAction = (action: 'addRow' | 'addCol' | 'delRow' | 'delTable') => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const node = sel.getRangeAt(0).commonAncestorContainer;
    const elem = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
    const cell = elem?.closest('td, th') as HTMLTableCellElement | null;
    const row = elem?.closest('tr') as HTMLTableRowElement | null;
    const table = elem?.closest('table') as HTMLTableElement | null;
    if (!table) return;

    if (action === 'delTable') {
      table.remove();
      setInsideTable(false);
      emitEditorChange(true);
      return;
    }
    if (action === 'delRow' && row) {
      if (table.rows.length <= 1) {
        table.remove();
        setInsideTable(false);
      } else {
        row.remove();
      }
      emitEditorChange(true);
      return;
    }
    if (action === 'addRow' && row) {
      const targetBody = row.parentElement;
      const newRow = document.createElement('tr');
      const colCount = row.cells.length || 2;
      for (let i = 0; i < colCount; i += 1) {
        const td = document.createElement('td');
        td.textContent = 'Isi baharu';
        newRow.appendChild(td);
      }
      targetBody?.insertBefore(newRow, row.nextSibling);
      emitEditorChange(true);
      return;
    }
    if (action === 'addCol' && cell) {
      const colIdx = cell.cellIndex;
      Array.from(table.rows).forEach((tr) => {
        const isHeader = tr.parentElement?.tagName === 'THEAD';
        const newCell = document.createElement(isHeader ? 'th' : 'td');
        newCell.textContent = isHeader ? 'Lajur Baharu' : 'Data';
        const refCell = tr.cells[colIdx + 1] ?? null;
        tr.insertBefore(newCell, refCell);
      });
      emitEditorChange(true);
    }
  };

  // Klik elemen media (gambar, video atau audio) dalam editor untuk kawalan langsung
  const clearMediaSelectionOutline = () => {
    editorRef.current?.querySelectorAll('[data-iknow-selected]').forEach((node) => {
      node.removeAttribute('data-iknow-selected');
    });
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const figure = target.closest('figure.iknow-figure') as HTMLElement | null;
    const directImg = target.tagName === 'IMG' ? (target as HTMLImageElement) : null;
    const directVid = target.tagName === 'VIDEO' ? (target as HTMLVideoElement) : null;
    const directAud = target.tagName === 'AUDIO' ? (target as HTMLAudioElement) : null;

    if (figure) {
      clearMediaSelectionOutline();
      figure.setAttribute('data-iknow-selected', 'true');
      const rawType = figure.getAttribute('data-iknow-type');
      const kind: 'image' | 'video' | 'audio' =
        rawType === 'audio' || Boolean(figure.querySelector('audio'))
          ? 'audio'
          : rawType === 'video' || Boolean(figure.querySelector('video'))
            ? 'video'
            : 'image';

      const mediaEl =
        kind === 'audio'
          ? (figure.querySelector('audio') as HTMLAudioElement | null)
          : kind === 'video'
            ? (figure.querySelector('video') as HTMLVideoElement | null)
            : (figure.querySelector('img') as HTMLImageElement | null);
      const alignRaw = figure.getAttribute('data-align');
      const align =
        alignRaw === 'left' || alignRaw === 'right' || alignRaw === 'center' ? alignRaw : 'center';
      const defaultW = kind === 'image' ? 75 : 100;
      const widthPercent = parsePercentWidth(
        figure.getAttribute('data-width') || mediaEl?.style.width,
        defaultW
      );
      const caption = figure.querySelector('figcaption')?.textContent ?? '';
      setSelectedMedia({
        kind,
        figure,
        src: mediaEl?.getAttribute('src') || '',
        widthPercent,
        align,
        caption,
      });
      return;
    }

    if (directImg || directVid || directAud) {
      const mediaEl = directImg ?? directVid ?? directAud!;
      const kind: 'image' | 'video' | 'audio' = directAud
        ? 'audio'
        : directVid
          ? 'video'
          : 'image';
      const defaultW = kind === 'image' ? 75 : 100;
      const fig = document.createElement('figure');
      fig.className =
        kind === 'audio'
          ? 'iknow-figure iknow-audio-figure'
          : kind === 'video'
            ? 'iknow-figure iknow-video-figure'
            : 'iknow-figure';
      fig.setAttribute('data-iknow-type', kind);
      fig.setAttribute('data-align', 'center');
      fig.setAttribute('data-width', `${defaultW}%`);
      fig.setAttribute('data-iknow-selected', 'true');
      mediaEl.replaceWith(fig);
      fig.appendChild(mediaEl);
      const cap = document.createElement('figcaption');
      cap.textContent = '';
      fig.appendChild(cap);
      setSelectedMedia({
        kind,
        figure: fig,
        src: mediaEl.getAttribute('src') || '',
        widthPercent: defaultW,
        align: 'center',
        caption: '',
      });
      emitEditorChange(true);
      return;
    }

    clearMediaSelectionOutline();
    setSelectedMedia(null);
  };

  // Muat naik Gambar ke Firebase Storage
  const handleSelectImageFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    replaceExisting = false
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setMediaError(null);
    setUploadingKind('image');
    setUploadProgress({percent: 0, bytesTransferred: 0, totalBytes: file.size});

    try {
      const res = await uploadNoteImage(
        file,
        topicId || 'umum',
        (info) => setUploadProgress(info),
        (task) => {
          activeUploadTaskRef.current = task;
        }
      );

      if (replaceExisting && selectedMedia?.kind === 'image') {
        const img = selectedMedia.figure.querySelector('img');
        if (img) {
          img.setAttribute('src', res.url);
          img.setAttribute('alt', file.name);
        }
        selectedMedia.figure.setAttribute('data-storage-path', res.storagePath);
        setSelectedMedia({...selectedMedia, src: res.url});
        emitEditorChange(true);
      } else {
        const safeAlt = file.name.replace(/["<>]/g, '');
        const figureHtml = `<figure class="iknow-figure" data-iknow-type="image" data-storage-path="${res.storagePath}" data-align="center" data-width="75%"><img src="${res.url}" alt="${safeAlt}" style="width: 75%;" /><figcaption>${safeAlt}</figcaption></figure><p><br></p>`;
        insertHtmlAtCursor(figureHtml);
      }
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Gagal memuat naik gambar.');
    } finally {
      activeUploadTaskRef.current = null;
      setUploadingKind(null);
      setUploadProgress(null);
    }
  };

  // Muat naik Video MP4 / WEBM ke Firebase Storage
  const handleSelectVideoFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    replaceExisting = false
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setMediaError(null);
    setUploadingKind('video');
    setUploadProgress({percent: 0, bytesTransferred: 0, totalBytes: file.size});

    try {
      const res = await uploadNoteVideo(
        file,
        topicId || 'umum',
        (info) => setUploadProgress(info),
        (task) => {
          activeUploadTaskRef.current = task;
        }
      );

      if (replaceExisting && selectedMedia?.kind === 'video') {
        const vid = selectedMedia.figure.querySelector('video');
        if (vid) {
          vid.setAttribute('src', res.url);
        }
        selectedMedia.figure.setAttribute('data-storage-path', res.storagePath);
        setSelectedMedia({...selectedMedia, src: res.url});
        emitEditorChange(true);
      } else {
        setStagedVideo({
          url: res.url,
          storagePath: res.storagePath,
          fileName: file.name,
          sizeBytes: res.sizeBytes,
          caption: file.name.replace(/\.[^.]+$/, ''),
        });
        setVideoDrawerOpen(true);
      }
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Gagal memuat naik video.');
    } finally {
      activeUploadTaskRef.current = null;
      setUploadingKind(null);
      setUploadProgress(null);
    }
  };

  const handleInsertStagedVideo = () => {
    if (!stagedVideo) return;
    const safeCap = stagedVideo.caption.trim().replace(/[<>]/g, '');
    const figureHtml = `<figure class="iknow-figure iknow-video-figure" data-iknow-type="video" data-storage-path="${stagedVideo.storagePath}" data-align="center" data-width="100%"><video controls playsinline preload="metadata" src="${stagedVideo.url}" style="width: 100%;"></video>${
      safeCap ? `<figcaption>${safeCap}</figcaption>` : ''
    }</figure><p><br></p>`;
    insertHtmlAtCursor(figureHtml);
    setStagedVideo(null);
    setVideoDrawerOpen(false);
    setPreviewVideoPlaying(false);
  };

  // Muat naik Audio MP3 / WAV / OGG / M4A ke Firebase Storage
  const handleSelectAudioFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    replaceExisting = false
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setMediaError(null);
    setUploadingKind('audio');
    setUploadProgress({percent: 0, bytesTransferred: 0, totalBytes: file.size});

    try {
      const res = await uploadNoteAudio(
        file,
        topicId || 'umum',
        (info) => setUploadProgress(info),
        (task) => {
          activeUploadTaskRef.current = task;
        }
      );

      if (replaceExisting && selectedMedia?.kind === 'audio') {
        const aud = selectedMedia.figure.querySelector('audio');
        if (aud) {
          aud.setAttribute('src', res.url);
        }
        selectedMedia.figure.setAttribute('data-storage-path', res.storagePath);
        setSelectedMedia({...selectedMedia, src: res.url});
        emitEditorChange(true);
      } else {
        setStagedAudio({
          url: res.url,
          storagePath: res.storagePath,
          fileName: file.name,
          sizeBytes: res.sizeBytes,
          caption: file.name.replace(/\.[^.]+$/, ''),
        });
        setAudioDrawerOpen(true);
      }
    } catch (err) {
      setMediaError(err instanceof Error ? err.message : 'Gagal memuat naik fail audio.');
    } finally {
      activeUploadTaskRef.current = null;
      setUploadingKind(null);
      setUploadProgress(null);
    }
  };

  const handleInsertStagedAudio = () => {
    if (!stagedAudio) return;
    const safeCap = stagedAudio.caption.trim().replace(/[<>]/g, '');
    const figureHtml = `<figure class="iknow-figure iknow-audio-figure" data-iknow-type="audio" data-storage-path="${stagedAudio.storagePath}" data-align="center" data-width="100%"><audio controls preload="metadata" src="${stagedAudio.url}" style="width: 100%;"></audio>${
      safeCap ? `<figcaption>${safeCap}</figcaption>` : ''
    }</figure><p><br></p>`;
    insertHtmlAtCursor(figureHtml);
    setStagedAudio(null);
    setAudioDrawerOpen(false);
  };

  const updateSelectedMedia = (patch: {
    widthPercent?: number;
    align?: 'left' | 'center' | 'right';
    caption?: string;
  }) => {
    if (!selectedMedia) return;
    const fig = selectedMedia.figure;
    const nextWidth = patch.widthPercent ?? selectedMedia.widthPercent;
    const nextAlign = patch.align ?? selectedMedia.align;
    const nextCaption = patch.caption ?? selectedMedia.caption;

    fig.setAttribute('data-width', `${nextWidth}%`);
    fig.setAttribute('data-align', nextAlign);

    const mediaEl =
      selectedMedia.kind === 'audio'
        ? fig.querySelector('audio')
        : selectedMedia.kind === 'video'
          ? fig.querySelector('video')
          : fig.querySelector('img');
    if (mediaEl) {
      (mediaEl as HTMLElement).style.width = `${nextWidth}%`;
    }

    let figcap = fig.querySelector('figcaption');
    if (nextCaption.trim()) {
      if (!figcap) {
        figcap = document.createElement('figcaption');
        fig.appendChild(figcap);
      }
      figcap.textContent = nextCaption;
    } else if (figcap) {
      figcap.remove();
    }

    setSelectedMedia({
      ...selectedMedia,
      widthPercent: nextWidth,
      align: nextAlign,
      caption: nextCaption,
    });
    emitEditorChange(true);
  };

  const deleteSelectedMedia = () => {
    if (!selectedMedia) return;
    selectedMedia.figure.remove();
    setSelectedMedia(null);
    emitEditorChange(true);
  };

  const serializedLength = serializeNoteContent(valueHtml, templateId).length;
  const activeTemplate = getTemplateById(templateId);

  return (
    <div className="space-y-3">
      {/* Input fail tersembunyi untuk muat naik terus */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleSelectImageFile(e, false)}
      />
      <input
        ref={replaceImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleSelectImageFile(e, true)}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept=".mp4,.webm,video/mp4,video/webm"
        className="hidden"
        onChange={(e) => handleSelectVideoFile(e, false)}
      />
      <input
        ref={replaceVideoInputRef}
        type="file"
        accept=".mp4,.webm,video/mp4,video/webm"
        className="hidden"
        onChange={(e) => handleSelectVideoFile(e, true)}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept=".mp3,.wav,.ogg,.aac,.m4a,audio/*"
        className="hidden"
        onChange={(e) => handleSelectAudioFile(e, false)}
      />
      <input
        ref={replaceAudioInputRef}
        type="file"
        accept=".mp3,.wav,.ogg,.aac,.m4a,audio/*"
        className="hidden"
        onChange={(e) => handleSelectAudioFile(e, true)}
      />

      {/* Bar Template Aktif */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
        <div className="flex items-center gap-2 text-xs">
          <LayoutTemplate className="h-4 w-4 text-[#064e3b] shrink-0" />
          <span className="font-medium text-slate-600">Template Aktif:</span>
          <span className="font-bold text-[#064e3b]">
            {activeTemplate.name}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowTemplates((v) => !v)}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          <LayoutTemplate className="h-3.5 w-3.5 text-[#064e3b]" />
          {showTemplates ? 'Tutup Pilihan Template' : 'Pilih / Pratonton Template'}
        </button>
      </div>

      {/* Pilihan 6 Template Nota dengan Pratonton Sebelum Memilih */}
      {showTemplates && (
        <div className="rounded-2xl border border-[#cce7db] bg-[#f3faf6] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Pilih Template Susun Atur Nota
              </h4>
              <p className="text-xs text-slate-600">
                Klik <strong>Pratonton</strong> untuk melihat susun atur sebelum memilih, atau klik terus pada kad untuk mula menulis. Semua teks dan media boleh disunting sepenuhnya selepas dipilih.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {NOTE_TEMPLATES.map((tpl) => {
              const selected = tpl.id === templateId;
              return (
                <div
                  key={tpl.id}
                  className={`flex flex-col justify-between rounded-xl border p-3.5 transition-colors ${
                    selected
                      ? 'border-[#064e3b] bg-white ring-1 ring-[#064e3b]'
                      : 'border-slate-200 bg-white hover:border-emerald-400'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900">{tpl.name}</span>
                      <span className="text-[11px] font-semibold text-[#064e3b]">
                        {tpl.badge}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">
                      {tpl.subtitle}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                    <button
                      type="button"
                      onClick={() => setPreviewTemplate(tpl)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Eye className="h-3 w-3 text-[#064e3b]" />
                      Pratonton
                    </button>

                    <button
                      type="button"
                      onClick={() => applyTemplate(tpl.id)}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                        selected
                          ? 'bg-[#f3faf6] text-[#064e3b] border border-[#cce7db]'
                          : 'bg-[#064e3b] text-white hover:bg-[#047857]'
                      }`}
                    >
                      {selected ? (
                        <>
                          <Check className="h-3 w-3" /> Digunakan
                        </>
                      ) : (
                        'Gunakan'
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {pendingTemplateId && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e6dcc6] bg-[#fbf7ee] p-3 text-xs text-slate-800">
              <span>
                Editor sudah mempunyai kandungan. Menggantikan dengan template{' '}
                <strong>{getTemplateById(pendingTemplateId).name}</strong> akan menggantikan susun atur semasa.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPendingTemplateId(null)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700"
                >
                  Kekalkan Kandungan
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate(pendingTemplateId, true)}
                  className="rounded-lg bg-[#064e3b] px-3 py-1.5 font-semibold text-white hover:bg-[#047857]"
                >
                  Terapkan Template
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toolbar Editor Dokumen */}
      <div className="rounded-2xl border border-slate-300 bg-white overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 p-2.5 space-y-2">
          {/* Baris 1: Undo/Redo, Heading, Font Family, Font Size, Format Tulisan, Warna */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Undo & Redo */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleUndo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
                className="rounded p-1.5 text-slate-700 hover:bg-slate-100 disabled:opacity-35"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleRedo}
                disabled={!canRedo}
                title="Redo (Ctrl+Y)"
                className="rounded p-1.5 text-slate-700 hover:bg-slate-100 disabled:opacity-35"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Tajuk P / H1 / H2 / H3 */}
            <select
              aria-label="Gaya Tajuk"
              value={activeFormats.block}
              onMouseDown={saveSelection}
              onChange={(e) => execCmd('formatBlock', `<${e.target.value}>`)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700"
            >
              <option value="p">Perenggan Biasa</option>
              <option value="h1">Tajuk H1</option>
              <option value="h2">Tajuk H2</option>
              <option value="h3">Tajuk H3</option>
            </select>

            {/* Jenis Tulisan */}
            <select
              aria-label="Jenis Tulisan"
              defaultValue=""
              onMouseDown={saveSelection}
              onChange={(e) => {
                if (e.target.value) handleApplyFontFamily(e.target.value);
                e.target.value = '';
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 max-w-[160px]"
            >
              <option value="" disabled>
                Jenis Tulisan
              </option>
              {FONT_FAMILIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>

            {/* Saiz Tulisan */}
            <select
              aria-label="Saiz Tulisan"
              defaultValue=""
              onMouseDown={saveSelection}
              onChange={(e) => {
                if (e.target.value) handleApplyFontSize(e.target.value);
                e.target.value = '';
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
            >
              <option value="" disabled>
                Saiz
              </option>
              {FONT_SIZES.map((sz) => (
                <option key={sz} value={sz}>
                  {sz}
                </option>
              ))}
            </select>

            {/* Bold, Italic, Underline */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execCmd('bold')}
                title="Bold"
                className={`rounded p-1.5 ${
                  activeFormats.bold
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execCmd('italic')}
                title="Italic"
                className={`rounded p-1.5 ${
                  activeFormats.italic
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execCmd('underline')}
                title="Underline"
                className={`rounded p-1.5 ${
                  activeFormats.underline
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Underline className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Warna Tulisan */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveSelection();
                }}
                onClick={() => {
                  setTextColorOpen((v) => !v);
                  setHighlightOpen(false);
                  setTablePopoverOpen(false);
                }}
                title="Warna Tulisan"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <Palette className="h-3.5 w-3.5 text-[#064e3b]" />
                Warna
              </button>
              {textColorOpen && (
                <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-2.5 shadow-lg space-y-2">
                  <p className="text-[11px] font-semibold text-slate-600">Warna Tulisan</p>
                  <div className="flex flex-wrap gap-1.5">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          execCmd('foreColor', c.value);
                          setTextColorOpen(false);
                        }}
                        title={c.label}
                        className="h-6 w-6 rounded-md border border-slate-300"
                        style={{backgroundColor: c.value}}
                      />
                    ))}
                  </div>
                  <label className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px] text-slate-600">
                    <span>Pilih warna lain:</span>
                    <input
                      type="color"
                      defaultValue="#0f172a"
                      onChange={(e) => execCmd('foreColor', e.target.value)}
                      className="h-6 w-8 cursor-pointer rounded border border-slate-200"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Warna Latar Tulisan */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveSelection();
                }}
                onClick={() => {
                  setHighlightOpen((v) => !v);
                  setTextColorOpen(false);
                  setTablePopoverOpen(false);
                }}
                title="Warna Latar Tulisan"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <Highlighter className="h-3.5 w-3.5 text-amber-700" />
                Latar
              </button>
              {highlightOpen && (
                <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-2.5 shadow-lg space-y-2">
                  <p className="text-[11px] font-semibold text-slate-600">Warna Latar Tulisan</p>
                  <div className="flex flex-wrap gap-1.5">
                    {HIGHLIGHT_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          execCmd('hiliteColor', c.value);
                          setHighlightOpen(false);
                        }}
                        title={c.label}
                        className="h-6 w-6 rounded-md border border-slate-300 text-[10px] font-bold text-slate-500"
                        style={{backgroundColor: c.value === 'transparent' ? '#ffffff' : c.value}}
                      >
                        {c.value === 'transparent' ? '×' : ''}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px] text-slate-600">
                    <span>Pilih warna latar:</span>
                    <input
                      type="color"
                      defaultValue="#fef08a"
                      onChange={(e) => execCmd('hiliteColor', e.target.value)}
                      className="h-6 w-8 cursor-pointer rounded border border-slate-200"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Baris 2: Senarai, Penjajaran, Arab RTL/LTR, Jadual, INSERT IMAGE, INSERT VIDEO, INSERT AUDIO */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Senarai */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execCmd('insertUnorderedList')}
                title="Senarai Bullet"
                className={`rounded p-1.5 ${
                  activeFormats.ul
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execCmd('insertOrderedList')}
                title="Senarai Bernombor"
                className={`rounded p-1.5 ${
                  activeFormats.ol
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ListOrdered className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Penjajaran */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execCmd('justifyLeft')}
                title="Jajar Kiri"
                className={`rounded p-1.5 ${
                  activeFormats.left
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <AlignLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execCmd('justifyCenter')}
                title="Jajar Tengah"
                className={`rounded p-1.5 ${
                  activeFormats.center
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <AlignCenter className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execCmd('justifyRight')}
                title="Jajar Kanan"
                className={`rounded p-1.5 ${
                  activeFormats.right
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <AlignRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Pemformatan Arab & Arah RTL / LTR */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSetDirection('rtl')}
                title="Format Teks Arab (Arah Kanan ke Kiri / RTL)"
                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold ${
                  activeFormats.rtl
                    ? 'bg-[#064e3b] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Languages className="h-3.5 w-3.5" />
                Arab RTL
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSetDirection('ltr')}
                title="Arah Kiri ke Kanan (LTR)"
                className="rounded px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
              >
                LTR
              </button>
            </div>

            {/* Sisipan Jadual */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveSelection();
                }}
                onClick={() => {
                  setTablePopoverOpen((v) => !v);
                  setTextColorOpen(false);
                  setHighlightOpen(false);
                }}
                title="Sisip Jadual"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <Table2 className="h-3.5 w-3.5 text-[#064e3b]" />
                Jadual
              </button>
              {tablePopoverOpen && (
                <div className="absolute left-0 top-full z-20 mt-1 w-60 rounded-xl border border-slate-200 bg-white p-3 shadow-lg space-y-2.5">
                  <p className="text-xs font-bold text-slate-900">Sisip Jadual Baharu</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-600">Bil. Baris</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={tableRows}
                        onChange={(e) => setTableRows(Number(e.target.value))}
                        className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600">Bil. Lajur</label>
                      <input
                        type="number"
                        min={1}
                        max={8}
                        value={tableCols}
                        onChange={(e) => setTableCols(Number(e.target.value))}
                        className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={tableHasHeader}
                      onChange={(e) => setTableHasHeader(e.target.checked)}
                    />
                    Sertakan baris pengepala (header)
                  </label>
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTablePopoverOpen(false)}
                      className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleInsertTable}
                      className="rounded-md bg-[#064e3b] px-3 py-1 text-xs font-semibold text-white hover:bg-[#047857]"
                    >
                      Sisip
                    </button>
                  </div>
                </div>
              )}
            </div>

            {insideTable && (
              <div className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-1.5 py-0.5">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleTableAction('addRow')}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-emerald-900 hover:bg-emerald-100"
                >
                  <Rows className="h-3 w-3" /> +Baris
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleTableAction('addCol')}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-emerald-900 hover:bg-emerald-100"
                >
                  <Columns className="h-3 w-3" /> +Lajur
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleTableAction('delRow')}
                  className="rounded px-1.5 py-0.5 text-[11px] font-medium text-amber-800 hover:bg-amber-100"
                >
                  -Baris
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleTableAction('delTable')}
                  className="rounded px-1.5 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-100"
                >
                  Padam Jadual
                </button>
              </div>
            )}

            <div className="h-4 w-px bg-slate-300 mx-0.5 hidden sm:block" />

            {/* INSERT IMAGE */}
            <button
              type="button"
              disabled={uploadingKind !== null}
              onMouseDown={(e) => {
                e.preventDefault();
                saveSelection();
              }}
              onClick={() => {
                setMediaError(null);
                imageInputRef.current?.click();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#064e3b] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#047857] disabled:opacity-50"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              INSERT IMAGE
            </button>

            {/* INSERT VIDEO */}
            <button
              type="button"
              disabled={uploadingKind !== null}
              onMouseDown={(e) => {
                e.preventDefault();
                saveSelection();
              }}
              onClick={() => {
                setMediaError(null);
                setAudioDrawerOpen(false);
                setVideoDrawerOpen((v) => !v);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
            >
              <Film className="h-3.5 w-3.5" />
              INSERT VIDEO
            </button>

            {/* INSERT AUDIO */}
            <button
              type="button"
              disabled={uploadingKind !== null}
              onMouseDown={(e) => {
                e.preventDefault();
                saveSelection();
              }}
              onClick={() => {
                setMediaError(null);
                setVideoDrawerOpen(false);
                setAudioDrawerOpen((v) => !v);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#064e3b] bg-white px-3 py-1.5 text-xs font-semibold text-[#064e3b] hover:bg-[#f3faf6] disabled:opacity-50"
            >
              <Headphones className="h-3.5 w-3.5" />
              INSERT AUDIO
            </button>
          </div>
        </div>

        {/* Bar Kemajuan Muat Naik Firebase Storage */}
        {uploadingKind && uploadProgress && (
          <div className="border-b border-emerald-200 bg-emerald-50/70 px-4 py-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-2 font-semibold text-emerald-900">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Memuat naik{' '}
                {uploadingKind === 'image'
                  ? 'gambar'
                  : uploadingKind === 'video'
                    ? 'video'
                    : 'audio'}{' '}
                ke Firebase Storage...
              </span>
              <div className="flex items-center gap-3">
                <span className="font-mono-tabular text-emerald-800">
                  {uploadProgress.percent}% ({formatBytes(uploadProgress.bytesTransferred)} /{' '}
                  {formatBytes(uploadProgress.totalBytes)})
                </span>
                <button
                  type="button"
                  onClick={() => activeUploadTaskRef.current?.cancel()}
                  className="rounded border border-red-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-red-700 hover:bg-red-50"
                >
                  Batal
                </button>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-200">
              <div
                className="h-full bg-[#064e3b] transition-all duration-150"
                style={{width: `${uploadProgress.percent}%`}}
              />
            </div>
          </div>
        )}

        {/* Mesej Ralat Media */}
        {mediaError && (
          <div className="flex items-center justify-between gap-2 border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-800">
            <span>{mediaError}</span>
            <button
              type="button"
              onClick={() => setMediaError(null)}
              className="rounded p-1 hover:bg-red-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Drawer Muat Naik & Pratonton Video Sebelum Dimasukkan */}
        {videoDrawerOpen && (
          <div className="border-b border-amber-200 bg-amber-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-amber-700" />
                <h4 className="text-xs font-bold text-slate-900">
                  Muat Naik Video Pembelajaran (MP4 / WEBM · Maksimum 100 MB)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setVideoDrawerOpen(false)}
                className="rounded p-1 text-slate-500 hover:bg-amber-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {!stagedVideo ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-amber-300 bg-white p-3.5">
                <p className="text-xs text-slate-600">
                  Pilih fail video <strong>.mp4</strong> atau <strong>.webm</strong> daripada komputer/telefon anda untuk dimuat naik ke Firebase Storage dan dipratonton.
                </p>
                <button
                  type="button"
                  disabled={uploadingKind !== null}
                  onClick={() => videoInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Pilih Fail Video
                </button>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-900">
                    Pratonton Video: {stagedVideo.fileName} ({formatBytes(stagedVideo.sizeBytes)})
                  </span>
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="text-xs font-medium text-amber-800 hover:underline"
                  >
                    Tukar Fail Lain
                  </button>
                </div>

                <div
                  ref={previewVideoBoxRef}
                  className="overflow-hidden rounded-lg bg-slate-950"
                >
                  <video
                    ref={previewVideoRef}
                    src={stagedVideo.url}
                    controls
                    playsInline
                    onPlay={() => setPreviewVideoPlaying(true)}
                    onPause={() => setPreviewVideoPlaying(false)}
                    className="max-h-64 w-full"
                  />
                  <div className="flex items-center justify-between bg-slate-900 px-3 py-1.5 text-xs text-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        const v = previewVideoRef.current;
                        if (!v) return;
                        if (v.paused) void v.play();
                        else v.pause();
                      }}
                      className="inline-flex items-center gap-1 rounded bg-[#064e3b] px-2.5 py-1 font-semibold text-white hover:bg-[#047857]"
                    >
                      {previewVideoPlaying ? (
                        <Pause className="h-3 w-3" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                      {previewVideoPlaying ? 'Jeda' : 'Main'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const target = previewVideoBoxRef.current ?? previewVideoRef.current;
                        if (target?.requestFullscreen) void target.requestFullscreen();
                      }}
                      className="inline-flex items-center gap-1 rounded border border-slate-700 px-2.5 py-1 hover:bg-slate-800"
                    >
                      <Maximize2 className="h-3 w-3" /> Skrin Penuh
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={stagedVideo.caption}
                    onChange={(e) =>
                      setStagedVideo({...stagedVideo, caption: e.target.value})
                    }
                    placeholder="Kapsyen atau penerangan video (pilihan)"
                    className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleInsertStagedVideo}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#064e3b] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#047857]"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Masukkan ke Dalam Nota
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Drawer Muat Naik & Pratonton Audio Sebelum Dimasukkan */}
        {audioDrawerOpen && (
          <div className="border-b border-[#e6dcc6] bg-[#fbf7ee] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Headphones className="h-4 w-4 text-[#064e3b]" />
                <h4 className="text-xs font-bold text-slate-900">
                  Muat Naik Audio Pembelajaran (MP3, WAV, OGG, M4A · Maksimum 30 MB)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setAudioDrawerOpen(false)}
                className="rounded p-1 text-slate-500 hover:bg-amber-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {!stagedAudio ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-[#d4c39f] bg-white p-3.5">
                <p className="text-xs text-slate-600">
                  Pilih rakaman bacaan ayat, lafaz niat atau penerangan audio daripada peranti anda untuk dimuat naik ke Firebase Storage.
                </p>
                <button
                  type="button"
                  disabled={uploadingKind !== null}
                  onClick={() => audioInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#064e3b] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#047857] disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Pilih Fail Audio
                </button>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-[#e6dcc6] bg-white p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-900">
                    Pratonton Audio: {stagedAudio.fileName} ({formatBytes(stagedAudio.sizeBytes)})
                  </span>
                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    className="text-xs font-medium text-[#064e3b] hover:underline"
                  >
                    Tukar Fail Lain
                  </button>
                </div>

                <audio src={stagedAudio.url} controls className="w-full" />

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={stagedAudio.caption}
                    onChange={(e) =>
                      setStagedAudio({...stagedAudio, caption: e.target.value})
                    }
                    placeholder="Tajuk / kapsyen penerangan audio"
                    className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleInsertStagedAudio}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#064e3b] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#047857]"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Masukkan ke Dalam Nota
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Inspector Kawalan Media Terpilih (Gambar, Video atau Audio) */}
        {selectedMedia && (
          <div className="border-b border-[#cce7db] bg-[#f3faf6] px-4 py-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#064e3b]">
                Kawalan{' '}
                {selectedMedia.kind === 'image'
                  ? 'Gambar'
                  : selectedMedia.kind === 'video'
                    ? 'Video'
                    : 'Audio'}{' '}
                Terpilih
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedMedia.kind === 'image' && selectedMedia.src && (
                  <button
                    type="button"
                    onClick={() =>
                      setImagePreviewModal({
                        src: selectedMedia.src,
                        caption: selectedMedia.caption,
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-[#cce7db] bg-white px-2.5 py-1 text-xs font-medium text-[#064e3b] hover:bg-emerald-50"
                  >
                    <Maximize2 className="h-3 w-3" />
                    Pratonton Penuh
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    selectedMedia.kind === 'image'
                      ? replaceImageInputRef.current?.click()
                      : selectedMedia.kind === 'video'
                        ? replaceVideoInputRef.current?.click()
                        : replaceAudioInputRef.current?.click()
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className="h-3 w-3" />
                  Gantikan
                </button>
                <button
                  type="button"
                  onClick={deleteSelectedMedia}
                  className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                  Padam
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearMediaSelectionOutline();
                    setSelectedMedia(null);
                  }}
                  className="rounded p-1 text-slate-500 hover:bg-emerald-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-12 items-center">
              {/* Saiz Media */}
              <div className="sm:col-span-5 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-700">Saiz:</span>
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => updateSelectedMedia({widthPercent: pct})}
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold border ${
                      selectedMedia.widthPercent === pct
                        ? 'border-[#064e3b] bg-[#064e3b] text-white'
                        : 'border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={selectedMedia.widthPercent}
                  onChange={(e) =>
                    updateSelectedMedia({widthPercent: Number(e.target.value)})
                  }
                  className="w-20 accent-[#064e3b]"
                />
              </div>

              {/* Kedudukan Media */}
              <div className="sm:col-span-3 flex items-center gap-1">
                <span className="text-[11px] font-medium text-slate-700 mr-1">Posisi:</span>
                {(['left', 'center', 'right'] as const).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => updateSelectedMedia({align: pos})}
                    className={`rounded p-1 border ${
                      selectedMedia.align === pos
                        ? 'border-[#064e3b] bg-[#064e3b] text-white'
                        : 'border-slate-300 bg-white text-slate-700'
                    }`}
                    title={pos === 'left' ? 'Kiri' : pos === 'center' ? 'Tengah' : 'Kanan'}
                  >
                    {pos === 'left' ? (
                      <AlignLeft className="h-3.5 w-3.5" />
                    ) : pos === 'center' ? (
                      <AlignCenter className="h-3.5 w-3.5" />
                    ) : (
                      <AlignRight className="h-3.5 w-3.5" />
                    )}
                  </button>
                ))}
              </div>

              {/* Kapsyen / Penerangan */}
              <div className="sm:col-span-4">
                <input
                  type="text"
                  value={selectedMedia.caption}
                  onChange={(e) => updateSelectedMedia({caption: e.target.value})}
                  placeholder={
                    selectedMedia.kind === 'audio'
                      ? 'Tambah tajuk atau penerangan audio...'
                      : 'Tambah atau edit kapsyen...'
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Ruang Suntingan Dokumen (ContentEditable) */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={() => emitEditorChange(true)}
          onClick={handleEditorClick}
          onKeyUp={() => {
            saveSelection();
            refreshActiveFormats();
          }}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
              e.preventDefault();
              if (e.shiftKey) handleRedo();
              else handleUndo();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
              e.preventDefault();
              handleRedo();
            }
          }}
          className={`iknow-rich-content iknow-tpl-${templateId} min-h-[280px] max-h-[560px] overflow-y-auto bg-white p-5 focus:outline-none`}
        />

        {/* Footer Status Panjang Kandungan */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            Klik mana-mana gambar, video atau audio dalam editor untuk melaraskan saiz, kedudukan atau kapsyen.
          </span>
          <span
            className={`font-mono-tabular font-semibold ${
              serializedLength > CONTENT_BODY_MAX_LENGTH
                ? 'text-red-700'
                : serializedLength > CONTENT_BODY_MAX_LENGTH * 0.85
                  ? 'text-amber-700'
                  : 'text-slate-600'
            }`}
          >
            {serializedLength.toLocaleString()} / {CONTENT_BODY_MAX_LENGTH.toLocaleString()} aksara
          </span>
        </div>
      </div>

      {/* Modal Pratonton Template Sebelum Memilih */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4">
          <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#064e3b]">
                  Pratonton Susun Atur Template
                </p>
                <h4 className="text-base font-bold text-slate-900">
                  {previewTemplate.name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <NoteContentRenderer
                  body={serializeNoteContent(previewTemplate.starterHtml, previewTemplate.id)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-3.5">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => applyTemplate(previewTemplate.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#064e3b] px-4 py-2 text-xs font-semibold text-white hover:bg-[#047857]"
              >
                <Check className="h-3.5 w-3.5" />
                Pilih &amp; Gunakan Template Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pratonton Gambar Penuh Sebelum Diterbitkan */}
      {imagePreviewModal && (
        <div
          onClick={() => setImagePreviewModal(null)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 p-4 sm:p-8"
        >
          <button
            type="button"
            onClick={() => setImagePreviewModal(null)}
            className="absolute right-4 top-4 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] max-w-4xl flex-col items-center gap-3"
          >
            <img
              src={imagePreviewModal.src}
              alt={imagePreviewModal.caption || 'Pratonton gambar'}
              className="max-h-[75vh] max-w-full rounded-xl object-contain"
            />
            {imagePreviewModal.caption && (
              <p className="text-sm text-slate-200 text-center">{imagePreviewModal.caption}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
