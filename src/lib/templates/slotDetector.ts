/**
 * Slot Detection Utility - MASTER SHELL CREATOR
 * Updated to CAPTURE LIST STYLING (Checkmarks, Icons).
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

  // 1. FIND MAIN CONTENT CONTAINER
  function findMainContent(root: Element): Element {
    const candidates = Array.from(root.querySelectorAll('div, article, section, main'));
    let bestCandidate = root;
    let maxScore = 0;

    candidates.forEach(node => {
      const className = (node.getAttribute('class') || '').toLowerCase();
      const idName = (node.getAttribute('id') || '').toLowerCase();
      const ignore = ['sidebar', 'footer', 'header', 'nav', 'menu', 'popup', 'modal', 'cookie', 'widget'];
      
      // Note: We are stricter about ignoring sidebars here for the "Main Content" detection,
      // but we will still capture specific slots inside them if they are explicitly valid tags.
      if (ignore.some(term => className.includes(term) || idName.includes(term))) return;

      const paras = node.querySelectorAll('p').length;
      const headers = node.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
      
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

  // 2. EXTRACT SLOTS
  // We widen the search to include the sidebar elements if they are relevant
  const allElements = contentRoot.querySelectorAll('h1, h2, h3, h4, h5, h6, p, ul, ol, img');

  allElements.forEach((element) => {
    // Basic filter for junk
    if (element.closest('.footer, .nav, .menu, .widget')) return;

    const tagName = element.tagName.toLowerCase();
    let type: SlotType | null = null;
    
    if (tagName === 'h1' || tagName === 'h2') type = 'headline';
    else if (['h3', 'h4', 'h5', 'h6'].includes(tagName)) type = 'subheadline';
    else if (tagName === 'p') type = 'paragraph';
    else if (tagName === 'ul' || tagName === 'ol') type = 'list';
    else if (tagName === 'img') type = 'image';

    if (!type) return;
    if (element.hasAttribute('data-slot')) return;

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
    
    if (!baseId || baseId.length < 2) baseId = `${type}_${slots.length}`;

    let slotId = baseId;
    let counter = 1;
    while (slots.some(s => s.id === slotId)) {
      slotId = `${baseId}_${counter}`;
      counter++;
    }

    const label = slotId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    
    // Capture Content & DETECT LIST STYLING
    let originalContent = text;
    let listTemplate: string | undefined;

    if (type === 'list') {
      const items = Array.from(element.querySelectorAll('li'));
      
      // 1. Save the text content
      originalContent = items
        .map(li => li.textContent?.trim() || '')
        .filter(Boolean)
        .join('\n');

      // 2. Detect Pattern (Checkmarks, Icons, etc.)
      if (items.length > 0) {
        const firstLi = items[0];
        const firstLiHtml = firstLi.innerHTML;
        const firstLiText = firstLi.textContent || '';
        
        // If the HTML is significantly different from the text, it means there's formatting (icons/bold)
        // We create a "Template" by removing the text and putting a placeholder
        if (firstLiHtml.length > firstLiText.length + 10 || firstLi.children.length > 0) {
           // Simple heuristic: Replace the text content with {{CONTENT}}
           // This preserves <i class="check"></i> or <span> wrappers
           listTemplate = firstLiHtml.replace(firstLiText.trim(), '{{CONTENT}}');
        }
      }

    } else if (type === 'image') {
      originalContent = element.getAttribute('src') || '';
    }

    let effectiveType = type;
    if (type === 'paragraph' && originalContent.length < 100) {
      effectiveType = 'headline';
    }

    const attributes = Array.from(element.attributes)
      .filter(attr => attr.name !== 'data-slot' && attr.name !== 'src' && attr.name !== 'width' && attr.name !== 'height')
      .map(attr => `${attr.name}="${attr.value}"`)
      .join(' ');

    let width: number | undefined;
    let height: number | undefined;
    if (type === 'image') {
        const w = element.getAttribute('width');
        const h = element.getAttribute('height');
        if (w) width = parseInt(w, 10);
        if (h) height = parseInt(h, 10);
        element.setAttribute('data-slot', slotId);
    } else {
        element.setAttribute('data-slot', slotId);
    }

    slots.push({
      id: slotId,
      type: effectiveType,
      label,
      tagName: tagName,
      originalContent,
      attributes,
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
      ...(listTemplate ? { listTemplate } : {}) // Save the detected pattern
    });
  });

  return {
    htmlBody: contentRoot.innerHTML, 
    slots
  };
}
