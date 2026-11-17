import React, {useCallback, useEffect, useRef, useState} from 'react';
import type {UploadTask} from 'firebase/storage';
import {
  AArrowDown,
  AArrowUp,
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  Check,
  ChevronDown,
  Columns,
  Eye,
  FileText,
  Film,
  Headphones,
  Highlighter,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Languages,
  LayoutTemplate,
  List,
  ListOrdered,
  Loader2,
  Maximize2,
  MoveVertical,
  Pause,
  Play,
  Plus,
  Redo2,
  RefreshCw,
  Rows,
  SeparatorHorizontal,
  Strikethrough,
  Subscript,
  Superscript,
  Table2,
  Trash2,
  Underline,
  Undo2,
  Video,
  X,
} from 'lucide-react';
import {
  applyBlockAlignment,
  applyBlockIndent,
  applyBlockSpacing,
  applyDirectionFormatting,
  applyInlineSpanStyle,
  getClosestBlock,
  getSelectionFontSizePx,
  type ParagraphAlignment,
} from '../../lib/editorFormatting';
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
  {label: 'Plus Jakarta Sans (Lalai)', value: 'Plus Jakarta Sans, sans-serif'},
  {label: 'Roboto', value: 'Roboto, sans-serif'},
  {label: 'Arial', value: 'Arial, sans-serif'},
  {label: 'Georgia (Serif)', value: 'Georgia, serif'},
  {label: 'Times New Roman', value: '"Times New Roman", Times, serif'},
  {label: 'Amiri (Arab & Jawi)', value: 'Amiri, Noto Naskh Arabic, serif'},
  {label: 'Noto Naskh Arabic (Arab & Jawi)', value: '"Noto Naskh Arabic", Amiri, serif'},
  {label: 'JetBrains Mono', value: 'JetBrains Mono, monospace'},
];

const FONT_SIZES = [
  '11px',
  '12px',
  '14px',
  '16px',
  '18px',
  '20px',
  '24px',
  '28px',
  '32px',
  '36px',
];

const ACADEMIC_TEXT_COLORS = [
  {label: 'Hitam Dakwat', value: '#0f172a'},
  {label: 'Kelabu Akademik', value: '#475569'},
  {label: 'Hijau I-KNOW', value: '#064e3b'},
  {label: 'Zamrud', value: '#047857'},
  {label: 'Biru Akademik', value: '#1d4ed8'},
  {label: 'Emas / Perang', value: '#b45309'},
  {label: 'Merah Penekanan', value: '#b91c1c'},
  {label: 'Ungu', value: '#6d28d9'},
];

const ACADEMIC_HIGHLIGHT_COLORS = [
  {label: 'Tiada Latar', value: 'transparent'},
  {label: 'Kuning Penanda', value: '#fef08a'},
  {label: 'Hijau Lembut', value: '#bbf7d0'},
  {label: 'Krim Dalil', value: '#fbf7ee'},
  {label: 'Biru Lembut', value: '#dbeafe'},
  {label: 'Merah Jambu Lembut', value: '#fce7f3'},
  {label: 'Jingga Lembut', value: '#fed7aa'},
  {label: 'Kelabu Muda', value: '#f1f5f9'},
];

const LINE_SPACINGS = [
  {label: '1.15 (Padat)', value: '1.15'},
  {label: '1.35', value: '1.35'},
  {label: '1.50', value: '1.5'},
  {label: '1.75 (Lalai)', value: '1.75'},
  {label: '2.00 (Akademik)', value: '2'},
  {label: '2.40 (Arab Berbaris)', value: '2.4'},
];

const PARAGRAPH_SPACINGS = [
  {label: 'Rapat (4px)', value: '4px'},
  {label: 'Normal (10px)', value: '10px'},
  {label: 'Selesa (18px)', value: '18px'},
  {label: 'Luas (26px)', value: '26px'},
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
    strike: false,
    sub: false,
    sup: false,
    ul: false,
    ol: false,
    align: 'left' as ParagraphAlignment,
    rtl: false,
    block: 'p',
    fontSizeLabel: '16px',
    fontFamilyValue: '',
  });
  const [insideTable, setInsideTable] = useState(false);

  // Popover jadual, jarak & warna
  const [tablePopoverOpen, setTablePopoverOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [tableHasHeader, setTableHasHeader] = useState(true);
  const [textColorOpen, setTextColorOpen] = useState(false);
  const [activeTextColor, setActiveTextColor] = useState('#0f172a');
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [activeHighlightColor, setActiveHighlightColor] = useState('#fef08a');
  const [spacingOpen, setSpacingOpen] = useState(false);

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

  const closeToolbarPopovers = () => {
    setTablePopoverOpen(false);
    setTextColorOpen(false);
    setHighlightOpen(false);
    setSpacingOpen(false);
  };

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
      if (sliced.length > 80) sliced.shift();
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

  const restoreSelection = useCallback((): Range | null => {
    const el = editorRef.current;
    if (!el) return null;
    el.focus();
    const sel = window.getSelection();
    if (!sel) return null;
    if (savedRangeRef.current && el.contains(savedRangeRef.current.commonAncestorContainer)) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
      return savedRangeRef.current;
    }
    if (sel.rangeCount > 0 && el.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      return sel.getRangeAt(0);
    }
    return null;
  }, []);

  const refreshActiveFormats = useCallback(() => {
    const root = editorRef.current;
    const sel = window.getSelection();
    if (!sel || !root || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const node = range.commonAncestorContainer;
    if (!root.contains(node)) return;

    const elem = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
    setInsideTable(Boolean(elem?.closest('table')));

    const dirEl = elem?.closest('[dir]') as HTMLElement | null;
    const computedDir = elem ? window.getComputedStyle(elem).direction : 'ltr';
    const isRtl =
      dirEl && root.contains(dirEl)
        ? dirEl.getAttribute('dir')?.toLowerCase() === 'rtl'
        : computedDir === 'rtl';

    const closestBlock = getClosestBlock(root, node);
    const rawAlign =
      closestBlock?.style.textAlign ||
      (closestBlock ? window.getComputedStyle(closestBlock).textAlign : '') ||
      'left';
    const normAlign: ParagraphAlignment =
      rawAlign === 'center' || rawAlign === 'right' || rawAlign === 'justify'
        ? rawAlign
        : isRtl
          ? 'right'
          : 'left';

    const px = getSelectionFontSizePx(root, range);

    let fontFamilyValue = '';
    const inlineFontEl = elem?.closest('[style*="font-family"]') as HTMLElement | null;
    if (inlineFontEl && root.contains(inlineFontEl)) {
      const ff = inlineFontEl.style.fontFamily.toLowerCase();
      const matchedFont = FONT_FAMILIES.find((item) =>
        ff.includes(item.value.split(',')[0].replace(/["']/g, '').toLowerCase())
      );
      if (matchedFont) fontFamilyValue = matchedFont.value;
    }

    try {
      const blockVal = String(document.queryCommandValue('formatBlock') || 'p')
        .replace(/[<>]/g, '')
        .toLowerCase();
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
        sub: document.queryCommandState('subscript'),
        sup: document.queryCommandState('superscript'),
        ul: document.queryCommandState('insertUnorderedList'),
        ol: document.queryCommandState('insertOrderedList'),
        align: normAlign,
        rtl: isRtl,
        block: ['h1', 'h2', 'h3', 'p'].includes(blockVal) ? blockVal : 'p',
        fontSizeLabel: `${px}px`,
        fontFamilyValue,
      });
    } catch {
      setActiveFormats((prev) => ({
        ...prev,
        align: normAlign,
        rtl: isRtl,
        fontSizeLabel: `${px}px`,
        fontFamilyValue,
      }));
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

  // Penjajaran perenggan tepat (Kiri, Tengah, Kanan, Justify) hanya pada perenggan dipilih
  const handleAlign = (align: ParagraphAlignment) => {
    const root = editorRef.current;
    if (!root) return;
    const range = restoreSelection();
    if (!range) return;
    applyBlockAlignment(root, range, align);
    saveSelection();
    refreshActiveFormats();
    emitEditorChange(true);
  };

  // Indent & Outdent tanpa menukar perenggan kepada blockquote
  const handleIndent = (deltaPx: number) => {
    const root = editorRef.current;
    if (!root) return;
    const range = restoreSelection();
    if (!range) return;
    applyBlockIndent(root, range, deltaPx);
    saveSelection();
    refreshActiveFormats();
    emitEditorChange(true);
  };

  // Jarak baris & jarak antara perenggan
  const handleSpacing = (options: {lineHeight?: string; marginBottom?: string}) => {
    const root = editorRef.current;
    if (!root) return;
    const range = restoreSelection();
    if (!range) return;
    applyBlockSpacing(root, range, options);
    saveSelection();
    emitEditorChange(true);
  };

  // Pemformatan Tulisan Arab & Jawi RTL / LTR
  const handleSetDirection = (dir: 'rtl' | 'ltr') => {
    const root = editorRef.current;
    if (!root) return;
    const range = restoreSelection();
    if (!range) return;
    applyDirectionFormatting(root, range, dir, {autoApplyArabicFont: true});
    saveSelection();
    refreshActiveFormats();
    emitEditorChange(true);
  };

  const handleApplyFontSize = (sizePx: string) => {
    const root = editorRef.current;
    const sel = window.getSelection();
    const range = restoreSelection();
    if (!root || !sel || !range) return;
    applyInlineSpanStyle(root, sel, range, 'fontSize', sizePx);
    saveSelection();
    refreshActiveFormats();
    emitEditorChange(true);
  };

  const handleStepFontSize = (deltaPx: number) => {
    const root = editorRef.current;
    const sel = window.getSelection();
    const range = restoreSelection();
    if (!root || !sel || !range) return;
    const currentPx = getSelectionFontSizePx(root, range);
    const nextPx = Math.max(11, Math.min(40, currentPx + deltaPx));
    applyInlineSpanStyle(root, sel, range, 'fontSize', `${nextPx}px`);
    saveSelection();
    refreshActiveFormats();
    emitEditorChange(true);
  };

  const handleApplyFontFamily = (fontFamily: string) => {
    const root = editorRef.current;
    const sel = window.getSelection();
    const range = restoreSelection();
    if (!root || !sel || !range) return;
    applyInlineSpanStyle(root, sel, range, 'fontFamily', fontFamily);
    saveSelection();
    refreshActiveFormats();
    emitEditorChange(true);
  };

  const handleApplyTextColor = (color: string) => {
    const root = editorRef.current;
    const sel = window.getSelection();
    const range = restoreSelection();
    if (!root || !sel || !range) return;
    setActiveTextColor(color);
    applyInlineSpanStyle(root, sel, range, 'color', color);
    saveSelection();
    refreshActiveFormats();
    emitEditorChange(true);
  };

  const handleApplyHighlightColor = (color: string) => {
    const root = editorRef.current;
    const sel = window.getSelection();
    const range = restoreSelection();
    if (!root || !sel || !range) return;
    if (color !== 'transparent') {
      setActiveHighlightColor(color);
    }
    applyInlineSpanStyle(root, sel, range, 'backgroundColor', color);
    saveSelection();
    refreshActiveFormats();
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
    closeToolbarPopovers();
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
          <span className="font-bold text-[#064e3b]">{activeTemplate.name}</span>
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
                Klik <strong>Pratonton</strong> untuk melihat susun atur sebelum memilih, atau klik terus <strong>Gunakan</strong> untuk mula menulis. Semua format dan media boleh diubah suai selepas dipilih.
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

      {/* Toolbar Pemformatan Lengkap ala Microsoft Word */}
      <div className="rounded-2xl border border-slate-300 bg-white overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/95 p-2.5 space-y-2">
          {/* Baris 1: Undo/Redo, Tajuk, Font Family, Saiz (+/-), Format Aksara, Warna & Highlight */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Undo & Redo */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleUndo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
                className="flex h-8 w-8 items-center justify-center rounded text-slate-700 hover:bg-slate-100 disabled:opacity-35"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleRedo}
                disabled={!canRedo}
                title="Redo (Ctrl+Y)"
                aria-label="Redo"
                className="flex h-8 w-8 items-center justify-center rounded text-slate-700 hover:bg-slate-100 disabled:opacity-35"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Gaya Tajuk H1 / H2 / H3 / Teks Biasa */}
            <select
              aria-label="Gaya Tajuk"
              value={activeFormats.block}
              onMouseDown={saveSelection}
              onChange={(e) => execCmd('formatBlock', `<${e.target.value}>`)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700"
            >
              <option value="p">Teks Biasa</option>
              <option value="h1">Tajuk H1</option>
              <option value="h2">Tajuk H2</option>
              <option value="h3">Tajuk H3</option>
            </select>

            {/* Jenis Tulisan (Font Family) */}
            <select
              aria-label="Jenis Tulisan"
              value={activeFormats.fontFamilyValue}
              onMouseDown={saveSelection}
              onChange={(e) => {
                if (e.target.value) handleApplyFontFamily(e.target.value);
              }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 max-w-[175px]"
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

            {/* Saiz Tulisan Dropdown + Butang Besarkan / Kecilkan */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
              <select
                aria-label="Saiz Tulisan"
                value={
                  FONT_SIZES.includes(activeFormats.fontSizeLabel)
                    ? activeFormats.fontSizeLabel
                    : ''
                }
                onMouseDown={saveSelection}
                onChange={(e) => {
                  if (e.target.value) handleApplyFontSize(e.target.value);
                }}
                className="h-8 rounded bg-transparent px-2 text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="" disabled>
                  {activeFormats.fontSizeLabel || 'Saiz'}
                </option>
                {FONT_SIZES.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleStepFontSize(2)}
                title="Besarkan Saiz Tulisan (+2px)"
                aria-label="Besarkan Saiz Tulisan"
                className="flex h-8 w-8 items-center justify-center rounded text-slate-700 hover:bg-slate-100"
              >
                <AArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleStepFontSize(-2)}
                title="Kecilkan Saiz Tulisan (-2px)"
                aria-label="Kecilkan Saiz Tulisan"
                className="flex h-8 w-8 items-center justify-center rounded text-slate-700 hover:bg-slate-100"
              >
                <AArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Bold, Italic, Underline, Strikethrough, Subscript, Superscript */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execCmd('bold')}
                title="Bold (Tebal)"
                aria-label="Bold"
                className={`flex h-8 w-8 items-center justify-center rounded ${
                  activeFormats.bold
                    ? 'bg-emerald-100 text-[#064e3b]'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execCmd('italic')}
                title="Italic (Condong)"
                aria-label="Italic"
                className={`flex h-8 w-8 items-center justify-center rounded ${
                  activeFormats.italic
                    ? 'bg-emerald-100 text-[#064e3b]'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execCmd('underline')}
                title="Underline (Garis Bawah)"
                aria-label="Underline"
                className={`flex h-8 w-8 items-center justify-center rounded ${
                  activeFormats.underline
                    ? 'bg-emerald-100 text-[#064e3b]'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Underline className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execCmd('strikeThrough')}
                title="Strikethrough (Garis Potong)"
                aria-label="Strikethrough"
                className={`flex h-8 w-8 items-center justify-center rounded ${
                  activeFormats.strike
                    ? 'bg-emerald-100 text-[#064e3b]'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Strikethrough className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execCmd('subscript')}
                title="Subscript"
                aria-label="Subscript"
                className={`flex h-8 w-8 items-center justify-center rounded ${
                  activeFormats.sub
                    ? 'bg-emerald-100 text-[#064e3b]'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Subscript className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execCmd('superscript')}
                title="Superscript"
                aria-label="Superscript"
                className={`flex h-8 w-8 items-center justify-center rounded ${
                  activeFormats.sup
                    ? 'bg-emerald-100 text-[#064e3b]'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Superscript className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Warna Tulisan */}
            <div className="relative flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveSelection();
                }}
                onClick={() => handleApplyTextColor(activeTextColor)}
                title="Terapkan Warna Tulisan Semasa"
                className="flex h-8 items-center gap-1 rounded px-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <span className="flex flex-col items-center leading-none">
                  <Baseline className="h-3.5 w-3.5" />
                  <span
                    className="mt-0.5 h-1 w-4 rounded-full"
                    style={{backgroundColor: activeTextColor}}
                  />
                </span>
              </button>
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
                  setSpacingOpen(false);
                }}
                title="Pilih Warna Tulisan"
                aria-label="Pilih Warna Tulisan"
                className="flex h-8 w-6 items-center justify-center rounded text-slate-600 hover:bg-slate-100"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
              {textColorOpen && (
                <div className="absolute left-0 top-full z-30 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-lg space-y-2.5">
                  <p className="text-[11px] font-bold text-slate-700">
                    Warna Tulisan Akademik
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {ACADEMIC_TEXT_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          handleApplyTextColor(c.value);
                          setTextColorOpen(false);
                        }}
                        title={c.label}
                        className={`h-7 w-full rounded-md border transition-transform hover:scale-105 ${
                          activeTextColor === c.value
                            ? 'border-slate-900 ring-1 ring-slate-900'
                            : 'border-slate-300'
                        }`}
                        style={{backgroundColor: c.value}}
                      />
                    ))}
                  </div>
                  <label className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-600">
                    <span>Color Picker Bebas:</span>
                    <input
                      type="color"
                      value={activeTextColor}
                      onChange={(e) => handleApplyTextColor(e.target.value)}
                      className="h-7 w-10 cursor-pointer rounded border border-slate-200"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Warna Latar & Highlight Teks */}
            <div className="relative flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveSelection();
                }}
                onClick={() => handleApplyHighlightColor(activeHighlightColor)}
                title="Highlight Teks (1-Klik)"
                className="flex h-8 items-center gap-1 rounded px-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <span className="flex flex-col items-center leading-none">
                  <Highlighter className="h-3.5 w-3.5 text-amber-700" />
                  <span
                    className="mt-0.5 h-1 w-4 rounded-full border border-slate-300"
                    style={{backgroundColor: activeHighlightColor}}
                  />
                </span>
              </button>
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
                  setSpacingOpen(false);
                }}
                title="Pilih Warna Highlight / Latar"
                aria-label="Pilih Warna Highlight"
                className="flex h-8 w-6 items-center justify-center rounded text-slate-600 hover:bg-slate-100"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
              {highlightOpen && (
                <div className="absolute left-0 top-full z-30 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-lg space-y-2.5">
                  <p className="text-[11px] font-bold text-slate-700">
                    Highlight &amp; Warna Latar Teks
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {ACADEMIC_HIGHLIGHT_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          handleApplyHighlightColor(c.value);
                          setHighlightOpen(false);
                        }}
                        title={c.label}
                        className="h-7 w-full rounded-md border border-slate-300 text-xs font-bold text-slate-500 hover:scale-105 transition-transform"
                        style={{
                          backgroundColor: c.value === 'transparent' ? '#ffffff' : c.value,
                        }}
                      >
                        {c.value === 'transparent' ? '×' : ''}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-600">
                    <span>Warna Latar Bebas:</span>
                    <input
                      type="color"
                      value={activeHighlightColor}
                      onChange={(e) => handleApplyHighlightColor(e.target.value)}
                      className="h-7 w-10 cursor-pointer rounded border border-slate-200"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Baris 2: Penjajaran (termasuk Justify), Senarai, Indent/Outdent, Jarak Baris/Perenggan, Divider, Arab RTL/LTR, Jadual & Media */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Penjajaran Perenggan: Left, Center, Right, Justify */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleAlign('left')}
                title="Align Left (Jajar Kiri)"
                aria-label="Align Left"
                className={`flex h-8 w-8 items-center justify-center rounded ${
                  activeFormats.align === 'left'
                    ? 'bg-emerald-100 text-[#064e3b]'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <AlignLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleAlign('center')}
                title="Align Center (Jajar Tengah)"
                aria-label="Align Center"
                className={`flex h-8 w-8 items-center justify-center rounded ${
                  activeFormats.align === 'center'
                    ? 'bg-emerald-100 text-[#064e3b]'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <AlignCenter className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleAlign('right')}
                title="Align Right (Jajar Kanan)"
                aria-label="Align Right"
                className={`flex h-8 w-8 items-center justify-center rounded ${
                  activeFormats.align === 'right'
                    ? 'bg-emerald-100 text-[#064e3b]'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <AlignRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleAlign('justify')}
                title="Justify (Ratakan Kiri & Kanan)"
                aria-label="Justify"
                className={`flex h-8 w-8 items-center justify-center rounded ${
                  activeFormats.align === 'justify'
                    ? 'bg-[#064e3b] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <AlignJustify className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Senarai Bullet, Bernombor & Indent / Outdent */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execCmd('insertUnorderedList')}
                title="Senarai Bullet"
                aria-label="Senarai Bullet"
                className={`flex h-8 w-8 items-center justify-center rounded ${
                  activeFormats.ul
                    ? 'bg-emerald-100 text-[#064e3b]'
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
                aria-label="Senarai Bernombor"
                className={`flex h-8 w-8 items-center justify-center rounded ${
                  activeFormats.ol
                    ? 'bg-emerald-100 text-[#064e3b]'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ListOrdered className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleIndent(-24)}
                title="Outdent (Kurangkan Inden)"
                aria-label="Outdent"
                className="flex h-8 w-8 items-center justify-center rounded text-slate-700 hover:bg-slate-100"
              >
                <IndentDecrease className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleIndent(24)}
                title="Indent (Tambah Inden)"
                aria-label="Indent"
                className="flex h-8 w-8 items-center justify-center rounded text-slate-700 hover:bg-slate-100"
              >
                <IndentIncrease className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Jarak Baris (Line Spacing) & Jarak Perenggan */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  saveSelection();
                }}
                onClick={() => {
                  setSpacingOpen((v) => !v);
                  setTextColorOpen(false);
                  setHighlightOpen(false);
                  setTablePopoverOpen(false);
                }}
                title="Jarak Baris & Jarak Perenggan"
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <MoveVertical className="h-3.5 w-3.5 text-[#064e3b]" />
                <span>Jarak</span>
              </button>
              {spacingOpen && (
                <div className="absolute left-0 top-full z-30 mt-1 w-60 rounded-xl border border-slate-200 bg-white p-3 shadow-lg space-y-3">
                  <div>
                    <p className="text-[11px] font-bold text-slate-700 mb-1.5">
                      Jarak Baris (Line Spacing)
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {LINE_SPACINGS.map((ls) => (
                        <button
                          key={ls.value}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            handleSpacing({lineHeight: ls.value});
                            setSpacingOpen(false);
                          }}
                          className="rounded-md border border-slate-200 px-2 py-1 text-left text-[11px] font-medium text-slate-700 hover:border-[#064e3b] hover:bg-[#f3faf6]"
                        >
                          {ls.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-slate-100 pt-2.5">
                    <p className="text-[11px] font-bold text-slate-700 mb-1.5">
                      Jarak Antara Perenggan
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {PARAGRAPH_SPACINGS.map((ps) => (
                        <button
                          key={ps.value}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            handleSpacing({marginBottom: ps.value});
                            setSpacingOpen(false);
                          }}
                          className="rounded-md border border-slate-200 px-2 py-1 text-left text-[11px] font-medium text-slate-700 hover:border-[#064e3b] hover:bg-[#f3faf6]"
                        >
                          {ps.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pemisah Mendatar (Horizontal Divider) */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertHtmlAtCursor('<hr /><p><br></p>')}
              title="Sisip Garis Pemisah Mendatar (Horizontal Divider)"
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <SeparatorHorizontal className="h-3.5 w-3.5 text-slate-600" />
              <span className="hidden sm:inline">Pemisah</span>
            </button>

            {/* Sokongan Tulisan Arab & Jawi RTL / LTR */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSetDirection('rtl')}
                title="Format Tulisan Arab / Jawi (Arah Kanan ke Kiri / RTL)"
                className={`inline-flex h-8 items-center gap-1 rounded px-2 text-[11px] font-semibold ${
                  activeFormats.rtl
                    ? 'bg-[#064e3b] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Languages className="h-3.5 w-3.5" />
                Arab/Jawi RTL
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSetDirection('ltr')}
                title="Arah Teks Biasa (Kiri ke Kanan / LTR)"
                className={`h-8 rounded px-2 text-[11px] font-medium ${
                  !activeFormats.rtl
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
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
                  setSpacingOpen(false);
                }}
                title="Sisip Jadual"
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <Table2 className="h-3.5 w-3.5 text-[#064e3b]" />
                <span>Jadual</span>
              </button>
              {tablePopoverOpen && (
                <div className="absolute left-0 top-full z-30 mt-1 w-60 rounded-xl border border-slate-200 bg-white p-3 shadow-lg space-y-2.5">
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
                  className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] font-medium text-emerald-900 hover:bg-emerald-100"
                >
                  <Rows className="h-3 w-3" /> +Baris
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleTableAction('addCol')}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] font-medium text-emerald-900 hover:bg-emerald-100"
                >
                  <Columns className="h-3 w-3" /> +Lajur
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleTableAction('delRow')}
                  className="rounded px-1.5 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-100"
                >
                  -Baris
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleTableAction('delTable')}
                  className="rounded px-1.5 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100"
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
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#064e3b] px-3 text-xs font-semibold text-white hover:bg-[#047857] disabled:opacity-50"
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
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-amber-700 px-3 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
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
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#064e3b] bg-white px-3 text-xs font-semibold text-[#064e3b] hover:bg-[#f3faf6] disabled:opacity-50"
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
          className={`iknow-rich-content iknow-tpl-${templateId} min-h-[300px] max-h-[580px] overflow-y-auto bg-white p-5 sm:p-6 focus:outline-none`}
        />

        {/* Footer Status Panjang Kandungan */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            Pilih teks untuk memformat bahagian tertentu sahaja. Klik media untuk ubah saiz atau kapsyen.
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
