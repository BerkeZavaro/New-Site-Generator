/**
 * Slot Detection Utility - MASTER SHELL CREATOR
 * 1. Finds the Main Content Container.
 * 2. Extracts Text Slots (for the Writer).
 * 3. Extracts Image Slots + Dimensions (for the Image Studio).
 * 4. Preserves all original attributes (classes, styles) for the Assembler.
 */

import type { TemplateSlot, SlotType } from './types';

export interface DetectSlotsResult {
  htmlBody: string;
  slots: TemplateSlot[];
}

export function detectSlots(htmlBody: string): DetectSlotsResult {
  if (!htmlBody || typeof htmlBody !== 'string') return { htmlBody: '', slots: [] };

  let doc: Document;
  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(htmlBody, 'text/html');
  } catch (error) {
    return { htmlBody, slots: [] };
  }

  const body = doc.body || doc.documentElement;

  // 1. FIND MAIN CONTENT CONTAINER (Ignore Nav/Footer/Sidebar)
  function findMainContent(root: Element): Element {
    const candidates = Array.from(root.querySelectorAll('div, article, section, main'));
    let bestCandidate = root;
    let maxScore = 0;

    candidates.forEach(node => {
      const className = (node.getAttribute('class') || '').toLowerCase();
      const idName = (node.getAttribute('id') || '').toLowerCase();
      const ignore = ['sidebar', 'footer', 'header', 'nav', 'menu', 'popup', 'modal', 'cookie', 'widget'];
      if (ignore.some(term => className.includes(term) || idName.includes(term))) return;

      const paras = node.querySelectorAll('p').length;
      const headers = node.querySelectorAll('h1, h2, h3, h4, h5, h6').length;

      // We want a container with actual content density
      if (paras < 1) return;

      const score = paras + (headers * 2);
      if (score > maxScore) {
        maxScore = score;
        bestCandidate = node;
      }
    });

    return bestCandidate;
  }

  const contentRoot = findMainContent(body);
  const slots: TemplateSlot[] = [];

  // 2. EXTRACT SLOTS (Text AND Images)
  const allElements = contentRoot.querySelectorAll('h1, h2, h3, h4, h5, h6, p, ul, ol, img');

  allElements.forEach((element) => {
    // Double check we aren't inside a nested unwanted element
    if (element.closest('.sidebar, .footer, .nav, .menu, .widget')) return;

    const tagName = element.tagName.toLowerCase();
    let type: SlotType | null = null;

    if (tagName === 'h1' || tagName === 'h2') type = 'headline';
    else if (['h3', 'h4', 'h5', 'h6'].includes(tagName)) type = 'subheadline';
    else if (tagName === 'p') type = 'paragraph';
    else if (tagName === 'ul' || tagName === 'ol') type = 'list';
    else if (tagName === 'img') type = 'image';

    if (!type) return;
    if (element.hasAttribute('data-slot')) return;

    // Filter tiny text noise (but keep images)
    const text = element.textContent?.trim() || '';
    if (type !== 'image' && text.length < 5) return;

    // Generate ID
    let baseId = '';
    if (type === 'image') {
      const alt = element.getAttribute('alt') || 'image';
      baseId = alt.toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 20);
    } else {
      baseId = text.toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 35);
    }

    // Fallback ID
    if (!baseId || baseId.length < 2) baseId = `${type}_${slots.length}`;

    let slotId = baseId;
    let counter = 1;
    while (slots.some(s => s.id === slotId)) {
      slotId = `${baseId}_${counter}`;
      counter++;
    }

    const label = slotId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // Capture Content
    let originalContent = text;
    if (type === 'list') {
      const items = element.querySelectorAll('li');
      originalContent = Array.from(items)
        .map(li => li.textContent?.trim() || '')
        .filter(Boolean)
        .join('\n');
    } else if (type === 'image') {
      originalContent = element.getAttribute('src') || '';
    }

    // Determine effective type (Short P -> Headline)
    let effectiveType = type;
    if (type === 'paragraph' && originalContent.length < 100) {
      effectiveType = 'headline';
    }

    // CAPTURE ATTRIBUTES (Class, Style, etc.)
    const attributes = Array.from(element.attributes)
      .filter(attr => attr.name !== 'data-slot' && attr.name !== 'src' && attr.name !== 'width' && attr.name !== 'height')
      .map(attr => `${attr.name}="${attr.value}"`)
      .join(' ');

    // CAPTURE IMAGE DIMENSIONS
    let width: number | undefined;
    let height: number | undefined;
    if (type === 'image') {
      const w = element.getAttribute('width');
      const h = element.getAttribute('height');
      if (w) width = parseInt(w, 10);
      if (h) height = parseInt(h, 10);

      // Mark the element so we can find it later for replacement
      element.setAttribute('data-slot', slotId);
    } else {
      // Mark text elements
      element.setAttribute('data-slot', slotId);
    }

    slots.push({
      id: slotId,
      type: effectiveType,
      label,
      tagName: tagName,
      originalContent,
      attributes: attributes || undefined,
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
    });
  });

  return {
    htmlBody: contentRoot.innerHTML,
    slots,
  };
}
