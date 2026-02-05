/**
 * Slot Detection Utility - WORDPRESS CONTENT MODE
 * 1. Finds the "Main Content" container (ignoring nav/footer/sidebar).
 * 2. Extracts a linear stream of Headlines, Paragraphs, and Lists.
 * 3. Ignores images, buttons, and complex layout divs.
 */

import type { TemplateSlot, SlotType } from './types';

export interface DetectSlotsResult {
  htmlBody: string;
  slots: TemplateSlot[];
}

export function detectSlots(htmlBody: string): DetectSlotsResult {
  if (!htmlBody || typeof htmlBody !== 'string') return { htmlBody: htmlBody || '', slots: [] };

  let doc: Document;
  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(htmlBody, 'text/html');
  } catch (error) {
    return detectSlotsRegex(htmlBody);
  }

  const body = doc.body || doc.documentElement;
  if (!body) return { htmlBody, slots: [] };

  // 1. FIND MAIN CONTENT CONTAINER
  // We look for the container with the highest density of text tags (<p>, <h2>, etc.)
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

      if (paras < 2) return;

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

  // 2. EXTRACT LINEAR STREAM OF CONTENT
  const allElements = contentRoot.querySelectorAll('h1, h2, h3, h4, h5, h6, p, ul, ol');

  allElements.forEach((element) => {
    if (element.closest('.sidebar, .footer, .nav, .menu, .widget')) return;

    const tagName = element.tagName.toLowerCase();
    let type: SlotType | null = null;

    if (tagName === 'h1' || tagName === 'h2') type = 'headline';
    else if (['h3', 'h4', 'h5', 'h6'].includes(tagName)) type = 'subheadline';
    else if (tagName === 'p') type = 'paragraph';
    else if (tagName === 'ul' || tagName === 'ol') type = 'list';

    if (!type) return;
    if (element.hasAttribute('data-slot')) return;

    const text = element.textContent?.trim() || '';
    if (text.length < 5) return;

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

    let originalContent = text;
    if (type === 'list') {
      const items = element.querySelectorAll('li');
      originalContent = Array.from(items)
        .map(li => li.textContent?.trim() || '')
        .filter(Boolean)
        .join('\n');
    }

    // Short text (< 100 chars) is a Headline, even if it's a <p> tag
    let effectiveType = type;
    let maxLen = deriveMaxLength(tagName, originalContent, type);
    if (type === 'paragraph' && originalContent.length < 100) {
      effectiveType = 'headline';
      maxLen = Math.min(originalContent.length + 20, 100);
    }

    element.setAttribute('data-slot', slotId);

    const wc = wordCount(originalContent);
    slots.push({
      id: slotId,
      type: effectiveType,
      label,
      tagName: tagName,
      originalContent,
      wordCount: wc,
      maxLength: maxLen,
    });
  });

  return {
    htmlBody: contentRoot.innerHTML,
    slots,
  };
}

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function deriveMaxLength(tag: string, originalContent: string, type: SlotType): number {
  const len = originalContent.length;
  const t = tag.toLowerCase();

  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(t)) return Math.min(len + 15, 100);
  if (t === 'li') return Math.ceil(len * 1.2);

  return Math.min(Math.ceil(len * 1.2), 1200);
}

// Regex Fallback (Server-side / when DOMParser fails)
function detectSlotsRegex(htmlBody: string): DetectSlotsResult {
  const slots: TemplateSlot[] = [];
  let updatedHtml = htmlBody;

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
        maxLength: maxLen,
      });
      return `<${tagName}${attrs} data-slot="${slotId}">${content}</${tagName}>`;
    });
  });

  return { htmlBody: updatedHtml, slots };
}
