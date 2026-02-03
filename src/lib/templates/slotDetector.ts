/**
 * Slot Detection Utility - TEXT ONLY MODE
 * Automatically detects editable TEXT slots (Headlines, Paragraphs, Lists).
 * Ignores Images, Buttons, and Links to preserve layout stability.
 */

import type { TemplateSlot, SlotType } from './types';

export interface DetectSlotsResult {
  htmlBody: string;
  slots: TemplateSlot[];
}

/**
 * Detects editable content slots in HTML and adds data-slot attributes.
 */
export function detectSlots(htmlBody: string): DetectSlotsResult {
  if (!htmlBody || typeof htmlBody !== 'string') {
    return { htmlBody: htmlBody || '', slots: [] };
  }

  // Use DOMParser if available (browser)
  let doc: Document;
  let serializer: XMLSerializer | null = null;

  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(htmlBody, 'text/html');
    if (typeof XMLSerializer !== 'undefined') {
      serializer = new XMLSerializer();
    }
  } catch (error) {
    return detectSlotsRegex(htmlBody);
  }

  const body = doc.body || doc.documentElement;
  if (!body) {
    return { htmlBody, slots: [] };
  }

  const slots: TemplateSlot[] = [];
  let slotCounter = 0;

  /**
   * Helper: Check if element is inside an ignored structural element
   */
  function isInsideIgnoredElement(element: Element): boolean {
    const ignoredTags = ['nav', 'footer', 'header', 'script', 'style', 'svg', 'form', 'button'];
    const ignoredPatterns = ['menu', 'nav', 'footer', 'popup', 'hidden', 'sidebar', 'cookie', 'copyright'];

    let current: Element | null = element;

    while (current && current !== body) {
      const tagName = current.tagName.toLowerCase();
      if (ignoredTags.includes(tagName)) return true;

      const classAttr = current.getAttribute('class') || '';
      const idAttr = current.getAttribute('id') || '';
      const combined = `${classAttr} ${idAttr}`.toLowerCase();

      if (ignoredPatterns.some(pattern => combined.includes(pattern))) return true;

      current = current.parentElement;
    }
    return false;
  }

  /**
   * Helper: Determine the specific SlotType based on the HTML tag
   * STRICTLY TEXT ONLY: No Images, No CTAs.
   */
  function getSlotType(tagName: string): SlotType | null {
    const tag = tagName.toLowerCase();

    if (tag === 'h1' || tag === 'h2') return 'headline';
    if (['h3', 'h4', 'h5', 'h6'].includes(tag)) return 'subheadline';
    if (tag === 'p') return 'paragraph';
    if (tag === 'ul' || tag === 'ol') return 'list';

    // Explicitly ignore IMG and A tags now
    return null;
  }

  // SELECT ONLY TEXT ELEMENTS
  const allElements = body.querySelectorAll('h1, h2, h3, h4, h5, h6, p, ul, ol');

  allElements.forEach((element) => {
    if (isInsideIgnoredElement(element)) return;

    const type = getSlotType(element.tagName);
    if (!type) return;

    if (element.hasAttribute('data-slot')) return;

    const text = element.textContent?.trim() || '';
    // Skip empty or tiny text fragments
    if (text.length < 5) return;

    // Generate ID
    const baseId = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 35) || `${type}_${slots.length}`;

    let slotId = baseId;
    let counter = 1;
    while (slots.some(s => s.id === slotId)) {
      slotId = `${baseId}_${counter}`;
      counter++;
    }

    const label = slotId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // Capture original content
    let originalContent = text;
    if (type === 'list') {
      const items = element.querySelectorAll('li');
      originalContent = items.length > 0
        ? Array.from(items).map(li => li.textContent?.trim() || '').filter(Boolean).join('\n')
        : text;
    }

    element.setAttribute('data-slot', slotId);

    // LOGIC: Short text = Headline (even if <p>)
    const tag = element.tagName.toLowerCase();
    let effectiveType = type;
    let maxLen = deriveMaxLength(tag, originalContent, type);

    // Aggressive Headline Detection: If it's short, it's a headline.
    if (type === 'paragraph' && originalContent.length < 100) {
      effectiveType = 'headline';
      maxLen = Math.min(originalContent.length + 20, 100);
    }

    const wc = wordCount(originalContent);
    slots.push({
      id: slotId,
      type: effectiveType,
      label,
      tagName: tag,
      originalContent: originalContent,
      wordCount: wc,
      maxLength: maxLen,
    });
    slotCounter++;
  });

  // Serialize back to HTML string
  let updatedHtmlBody: string;
  if (serializer) {
    updatedHtmlBody = serializer.serializeToString(body);
    updatedHtmlBody = updatedHtmlBody.replace(/^<body[^>]*>|<\/body>$/gi, '');
  } else {
    updatedHtmlBody = (body as HTMLElement).innerHTML || htmlBody;
  }

  return { htmlBody: updatedHtmlBody, slots };
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function deriveMaxLength(tag: string, originalContent: string, type: SlotType): number {
  const len = originalContent.length;
  const t = tag.toLowerCase();

  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(t)) return Math.min(len + 15, 100);
  if (t === 'li') return Math.ceil(len * 1.2);

  // For paragraphs/lists, be strict relative to original size
  return Math.min(Math.ceil(len * 1.2), 1200);
}

// Minimal Regex Fallback (Server-side)
function detectSlotsRegex(htmlBody: string): DetectSlotsResult {
  // Simplified for text-only
  const slots: TemplateSlot[] = [];
  let updatedHtml = htmlBody;

  // Only text patterns
  const patterns = [
    { tag: '(h[1-2])', type: 'headline' as SlotType },
    { tag: '(h[3-6])', type: 'subheadline' as SlotType },
    { tag: '(p)', type: 'paragraph' as SlotType },
    { tag: '(ul|ol)', type: 'list' as SlotType },
  ];

  patterns.forEach(({ tag, type }) => {
    const regex = new RegExp(`<(${tag})([^>]*)>([\\s\\S]*?)<\\/\\1>`, 'gi');
    updatedHtml = updatedHtml.replace(regex, (match, tagName, attrs, content) => {
      if (attrs.includes('data-slot')) return match;

      const text = content.replace(/<[^>]*>/g, '').trim();
      if (text.length < 5) return match;

      const baseId = text.toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 35) || `${type}_${slots.length}`;
      let slotId = baseId;
      let counter = 1;
      while (slots.some(s => s.id === slotId)) { slotId = `${baseId}_${counter}`; counter++; }

      let effectiveType = type;
      let maxLen = deriveMaxLength(tagName, text, type);
      if (type === 'paragraph' && text.length < 100) {
        effectiveType = 'headline';
        maxLen = Math.min(text.length + 20, 100);
      }

      slots.push({
        id: slotId,
        type: effectiveType,
        label: slotId,
        tagName: tagName,
        originalContent: text,
        maxLength: maxLen
      });
      return `<${tagName}${attrs} data-slot="${slotId}">${content}</${tagName}>`;
    });
  });

  return { htmlBody: updatedHtml, slots };
}
