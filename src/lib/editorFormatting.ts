const BLOCK_SELECTOR = 'p, h1, h2, h3, h4, li, blockquote, td, th, div';
const BLOCK_TAG_NAMES = new Set([
  'P',
  'H1',
  'H2',
  'H3',
  'H4',
  'LI',
  'BLOCKQUOTE',
  'TD',
  'TH',
  'DIV',
]);

function isBlockElement(node: Node | null, root: HTMLElement): node is HTMLElement {
  if (!node || node === root || node.nodeType !== Node.ELEMENT_NODE) return false;
  return BLOCK_TAG_NAMES.has((node as HTMLElement).tagName.toUpperCase());
}

export function getClosestBlock(root: HTMLElement, node: Node | null): HTMLElement | null {
  let curr: Node | null = node;
  while (curr && curr !== root) {
    if (isBlockElement(curr, root)) {
      return curr;
    }
    curr = curr.parentNode;
  }
  return null;
}

function wrapLooseRootTextInParagraph(root: HTMLElement, range: Range): HTMLElement | null {
  const startNode = range.startContainer;
  if (startNode === root && root.childNodes.length === 0) {
    const p = root.ownerDocument.createElement('p');
    p.innerHTML = '<br>';
    root.appendChild(p);
    return p;
  }

  // Cari anak terus di bawah root yang mengandungi startContainer
  let directChild: Node | null = startNode;
  while (directChild && directChild.parentNode !== root) {
    directChild = directChild.parentNode;
  }
  if (!directChild || isBlockElement(directChild, root)) return null;

  const p = root.ownerDocument.createElement('p');
  directChild.parentNode?.insertBefore(p, directChild);
  p.appendChild(directChild);
  return p;
}

export function getSelectedBlockElements(root: HTMLElement, range: Range): HTMLElement[] {
  if (!root.contains(range.commonAncestorContainer)) return [];

  if (range.collapsed) {
    const direct = getClosestBlock(root, range.startContainer);
    if (direct) return [direct];
    const wrapped = wrapLooseRootTextInParagraph(root, range);
    return wrapped ? [wrapped] : [];
  }

  const matched = new Set<HTMLElement>();
  const allBlocks = Array.from(root.querySelectorAll(BLOCK_SELECTOR)) as HTMLElement[];

  for (const el of allBlocks) {
    // Abaikan bekas div luar jika ia hanya membungkus blok lain yang turut sepadan
    if (el.tagName === 'DIV' && el.querySelector('p, h1, h2, h3, h4, li, blockquote, table')) {
      continue;
    }
    try {
      if (range.intersectsNode(el)) {
        matched.add(el);
      }
    } catch {
      // Abaikan ralat sempadan julat pada pelayar tertentu
    }
  }

  if (matched.size === 0) {
    const fallback = getClosestBlock(root, range.commonAncestorContainer);
    if (fallback) {
      matched.add(fallback);
    } else {
      const wrapped = wrapLooseRootTextInParagraph(root, range);
      if (wrapped) matched.add(wrapped);
    }
  }

  return Array.from(matched);
}

export type ParagraphAlignment = 'left' | 'center' | 'right' | 'justify';

export function applyBlockAlignment(
  root: HTMLElement,
  range: Range,
  align: ParagraphAlignment
): HTMLElement[] {
  const blocks = getSelectedBlockElements(root, range);
  for (const block of blocks) {
    block.removeAttribute('align');
    block.style.textAlign = align;
    if (align === 'justify') {
      block.style.textJustify = 'inter-word';
    } else {
      block.style.removeProperty('text-justify');
    }
  }
  return blocks;
}

export function applyBlockSpacing(
  root: HTMLElement,
  range: Range,
  options: {lineHeight?: string; marginBottom?: string}
): HTMLElement[] {
  const blocks = getSelectedBlockElements(root, range);
  for (const block of blocks) {
    if (options.lineHeight !== undefined) {
      if (options.lineHeight) block.style.lineHeight = options.lineHeight;
      else block.style.removeProperty('line-height');
    }
    if (options.marginBottom !== undefined) {
      if (options.marginBottom) block.style.marginBottom = options.marginBottom;
      else block.style.removeProperty('margin-bottom');
    }
  }
  return blocks;
}

export function applyBlockIndent(
  root: HTMLElement,
  range: Range,
  deltaPx: number
): HTMLElement[] {
  const blocks = getSelectedBlockElements(root, range);
  for (const block of blocks) {
    const rawCurrent =
      block.style.paddingInlineStart || block.style.paddingLeft || '0px';
    const currentPx = parseInt(rawCurrent.replace('px', '').trim(), 10) || 0;
    const nextPx = Math.max(0, Math.min(144, currentPx + deltaPx));
    if (nextPx === 0) {
      block.style.removeProperty('padding-inline-start');
      block.style.removeProperty('padding-left');
    } else {
      block.style.paddingInlineStart = `${nextPx}px`;
    }
  }
  return blocks;
}

export function applyDirectionFormatting(
  root: HTMLElement,
  range: Range,
  dir: 'rtl' | 'ltr',
  options?: {autoApplyArabicFont?: boolean}
): void {
  const blocks = getSelectedBlockElements(root, range);
  if (blocks.length === 1 && !range.collapsed) {
    const block = blocks[0];
    const blockText = (block.textContent ?? '').trim();
    const selText = range.toString().trim();
    // Jika pengguna hanya memilih sebahagian frasa dalam satu ayat, formatkan frasa itu sahaja
    if (selText && blockText && selText.length < blockText.length) {
      const span = root.ownerDocument.createElement('span');
      span.setAttribute('dir', dir);
      span.style.direction = dir;
      span.style.unicodeBidi = 'isolate';
      if (dir === 'rtl' && options?.autoApplyArabicFont !== false) {
        span.style.fontFamily = 'Amiri, Noto Naskh Arabic, serif';
      }
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
      range.selectNodeContents(span);
      return;
    }
  }

  for (const block of blocks) {
    block.setAttribute('dir', dir);
    block.style.direction = dir;
    block.style.unicodeBidi = 'isolate';
    if (dir === 'rtl') {
      if (!block.style.textAlign || block.style.textAlign === 'left') {
        block.style.textAlign = 'right';
      }
      if (options?.autoApplyArabicFont !== false && !block.style.fontFamily) {
        block.style.fontFamily = 'Amiri, Noto Naskh Arabic, serif';
      }
    } else {
      if (!block.style.textAlign || block.style.textAlign === 'right') {
        block.style.textAlign = 'left';
      }
      if (block.style.fontFamily.includes('Amiri')) {
        block.style.removeProperty('font-family');
      }
    }
  }
}

type InlineStyleProp = 'fontFamily' | 'fontSize' | 'color' | 'backgroundColor';

function stripConflictingStyleFromFragment(frag: DocumentFragment, prop: InlineStyleProp) {
  const walker = frag.ownerDocument.createTreeWalker(frag, NodeFilter.SHOW_ELEMENT);
  let curr: Node | null = walker.nextNode();
  while (curr) {
    const el = curr as HTMLElement;
    el.style[prop] = '';
    if (prop === 'color' && el.tagName === 'FONT') {
      el.removeAttribute('color');
    }
    if (prop === 'fontFamily' && el.tagName === 'FONT') {
      el.removeAttribute('face');
    }
    curr = walker.nextNode();
  }
}

export function applyInlineSpanStyle(
  root: HTMLElement,
  selection: Selection,
  range: Range,
  prop: InlineStyleProp,
  value: string | null
): void {
  const doc = root.ownerDocument;
  const parentElem =
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as HTMLElement)
      : range.commonAncestorContainer.parentElement;

  if (range.collapsed) {
    if (parentElem && parentElem.tagName === 'SPAN' && root.contains(parentElem)) {
      if (value && value !== 'transparent') {
        parentElem.style[prop] = value;
      } else {
        parentElem.style[prop] = '';
      }
      return;
    }
    if (!value || value === 'transparent') return;
    const span = doc.createElement('span');
    span.style[prop] = value;
    const zwsp = doc.createTextNode('\u200B');
    span.appendChild(zwsp);
    range.insertNode(span);
    const nextRange = doc.createRange();
    nextRange.setStart(zwsp, 1);
    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);
    return;
  }

  // Jika keseluruhan span sedia ada dipilih tepat, kemas kini terus tanpa membungkus berlapis
  if (
    parentElem &&
    parentElem.tagName === 'SPAN' &&
    root.contains(parentElem) &&
    parentElem.textContent === range.toString()
  ) {
    if (value && value !== 'transparent') {
      parentElem.style[prop] = value;
    } else {
      parentElem.style[prop] = '';
    }
    const nextRange = doc.createRange();
    nextRange.selectNodeContents(parentElem);
    selection.removeAllRanges();
    selection.addRange(nextRange);
    return;
  }

  const frag = range.extractContents();
  stripConflictingStyleFromFragment(frag, prop);

  if (!value || value === 'transparent') {
    range.insertNode(frag);
    return;
  }

  const span = doc.createElement('span');
  span.style[prop] = value;
  span.appendChild(frag);
  range.insertNode(span);

  const nextRange = doc.createRange();
  nextRange.selectNodeContents(span);
  selection.removeAllRanges();
  selection.addRange(nextRange);
}

export function getSelectionFontSizePx(root: HTMLElement, range: Range): number {
  const node = range.startContainer;
  const elem =
    node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
  if (!elem || !root.contains(elem)) return 16;

  // Semak inline style dahulu
  let curr: HTMLElement | null = elem;
  while (curr && root.contains(curr)) {
    if (curr.style?.fontSize && curr.style.fontSize.endsWith('px')) {
      const parsed = parseFloat(curr.style.fontSize);
      if (Number.isFinite(parsed)) return Math.round(parsed);
    }
    if (curr === root) break;
    curr = curr.parentElement;
  }

  if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    const computed = parseFloat(window.getComputedStyle(elem).fontSize);
    if (Number.isFinite(computed)) return Math.round(computed);
  }
  return 16;
}
