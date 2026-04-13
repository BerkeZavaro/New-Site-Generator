/**
 * Slot Detection Utility - TEMPLATE-AGNOSTIC
 * Detects editable content slots in any HTML template.
 * Works with semantic HTML, div-heavy layouts, tables, and mixed structures.
 */

import type { TemplateSlot, SlotType } from './types';

export interface DetectSlotsResult {
  htmlBody: string;
  slots: TemplateSlot[];
}

// --- JUNK DETECTION ---

const JUNK_CONTAINER_SELECTORS = [
  'nav', 'footer', 'header',
  '.nav', '.navbar', '.menu', '.footer', '.header',
  '.cookie', '.popup', '.modal', '.overlay', '.widget',
  '.legal', '.copyright', '.disclaimer', '.privacy',
  '.social', '.share', '.sidebar-widget',
  '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
  '.share-buttons', '.social-share', '.modal', '.modal-content',
  '.mobSearch', '[role="search"]',
].join(', ');

const JUNK_PHRASES = new Set([
  'read more', 'click here', 'privacy policy', 'terms of service',
  'contact us', 'all rights reserved', 'submit', 'cookie', 'accept cookies',
  'subscribe', 'follow us', 'share this', 'powered by', 'back to top',
  'copyright', 'terms & conditions', 'terms and conditions',
]);

function isInsideJunkContainer(element: Element): boolean {
  return element.closest(JUNK_CONTAINER_SELECTORS) !== null;
}

function isJunkText(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (JUNK_PHRASES.has(lower)) return true;
  // Very short single-word navigation-style text
  if (lower.length < 4 && !lower.match(/^\d/)) return true;
  return false;
}

function isJunkUrl(url: string): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return (
    lower.includes('googletagmanager.com') ||
    lower.includes('google-analytics.com') ||
    lower.includes('facebook.net') ||
    lower.includes('file://') ||
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('data:image/gif') ||
    lower.includes('1x1') ||
    lower.includes('pixel') ||
    lower.includes('tracking')
  );
}

// --- CONTENT AREA DETECTION ---

function findMainContent(root: Element): Element {
  const candidates = Array.from(root.querySelectorAll('div, article, section, main, [role="main"]'));
  let bestCandidate = root;
  let maxScore = 0;

  for (const node of candidates) {
    const className = (node.getAttribute('class') || '').toLowerCase();
    const idName = (node.getAttribute('id') || '').toLowerCase();
    const role = (node.getAttribute('role') || '').toLowerCase();

    // Skip known junk containers
    const skip = ['footer', 'header', 'nav', 'menu', 'popup', 'modal', 'cookie',
                  'widget', 'legal', 'copyright', 'bottom-bar', 'disclaimer',
                  'sidebar', 'social', 'share', 'comment'];
    if (skip.some(term => className.includes(term) || idName.includes(term))) continue;

    // Bonus for semantic hints
    let bonus = 0;
    if (node.tagName.toLowerCase() === 'main' || role === 'main') bonus += 10;
    if (node.tagName.toLowerCase() === 'article') bonus += 5;
    if (className.includes('content') || idName.includes('content')) bonus += 5;
    if (className.includes('main') || idName.includes('main')) bonus += 3;
    if (className.includes('article') || className.includes('post') || className.includes('entry')) bonus += 3;

    // Score based on ALL text-containing elements, not just <p>
    const textElements = node.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, figcaption, td, th');
    const divTexts = Array.from(node.querySelectorAll('div, span')).filter(el => {
      const text = el.textContent?.trim() || '';
      return text.length > 30 && el.children.length === 0; // Leaf divs/spans with real text
    });

    const paras = node.querySelectorAll('p').length;
    const headers = node.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
    const lists = node.querySelectorAll('ul, ol').length;
    const images = node.querySelectorAll('img').length;

    const score = paras * 2 + headers * 3 + lists + images * 0.5 + divTexts.length + textElements.length + bonus;

    if (score > maxScore) {
      maxScore = score;
      bestCandidate = node;
    }
  }

  return bestCandidate;
}

// --- ELEMENT CLASSIFICATION ---

function classifyElement(element: Element, text: string): SlotType | null {
  const tag = element.tagName.toLowerCase();

  // Direct tag-based classification
  if (tag === 'img' || tag === 'picture') return 'image';
  if (tag === 'ul' || tag === 'ol') return 'list';
  if (tag === 'h1') return 'headline';
  if (tag === 'h2') return 'headline';
  if (tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') return 'subheadline';
  if (tag === 'blockquote') return 'paragraph';
  if (tag === 'figcaption') return 'paragraph';

  // Button/CTA detection
  if (tag === 'button') return 'cta';
  if (tag === 'a') {
    const className = (element.getAttribute('class') || '').toLowerCase();
    const linkText = text.toLowerCase();
    // Class-based CTA detection
    if (className.includes('btn') || className.includes('button') || className.includes('cta') || className.includes('submit')) {
      return 'cta';
    }
    // Text-based CTA detection
    const ctaPhrases = ['read the full review', 'see the full review', 'full review', 'visit site',
                        'buy now', 'shop now', 'learn more', 'get started', 'try now', 'order now',
                        'add to cart', 'sign up', 'get it now', 'claim', 'view deal'];
    if (ctaPhrases.some(phrase => linkText.includes(phrase))) {
      return 'cta';
    }
    return null; // Regular links should not become slots
  }

  // For <p>, <div>, <span>, <td> — classify by text length and context
  const len = text.length;
  if (len < 5) return null; // Too short to be useful

  if (tag === 'p') {
    // Filter out "Rating: X" labels in product tables
    const pTextLower = text.toLowerCase().trim();
    if (pTextLower.startsWith('rating:') || pTextLower.startsWith('rating :')) return null;

    // Check if this paragraph contains only a single link (it's a CTA wrapper)
    const links = element.querySelectorAll('a');
    if (links.length === 1 && links[0].textContent?.trim().length === text.length) {
      const linkClass = (links[0].getAttribute('class') || '').toLowerCase();
      const linkText = text.toLowerCase();
      const ctaPhrases = ['read the full review', 'see the full review', 'full review', 'visit site',
                          'buy now', 'shop now', 'learn more', 'get started', 'try now', 'order now',
                          'add to cart', 'sign up', 'get it now', 'claim', 'view deal'];
      if (linkClass.includes('btn') || linkClass.includes('button') || linkClass.includes('submit') ||
          ctaPhrases.some(phrase => linkText.includes(phrase))) {
        return 'cta';
      }
    }
    if (len < 50) return 'subheadline';
    return 'paragraph';
  }

  if (tag === 'div' || tag === 'span' || tag === 'td' || tag === 'th') {
    // Check if this is a leaf text node (no children with substantial text)
    const childElements = Array.from(element.children);
    const hasTextChildren = childElements.some(child => {
      const childTag = child.tagName.toLowerCase();
      return ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'div', 'span'].includes(childTag) &&
             (child.textContent?.trim().length || 0) > 10;
    });

    // Skip container divs — we'll catch their children instead
    if (hasTextChildren) return null;

    // Also skip divs that have many child elements (structural containers like product cards)
    if ((tag === 'div') && childElements.length > 5) return null;

    // Skip container elements where most text comes from children, not from the element itself.
    // This catches structural containers like product cards, feature comparison boxes, etc.
    // that aggregate text from many small children into one big text block.
    if (tag === 'div' || tag === 'td' || tag === 'th') {
      // Get direct text content (not from children)
      let directTextLength = 0;
      element.childNodes.forEach((node: any) => {
        if (node.nodeType === 3) { // Text node
          directTextLength += (node.textContent?.trim().length || 0);
        }
      });
      const totalTextLength = text.length;
      // If less than 20% of text is direct (rest comes from children), it's a container
      if (totalTextLength > 60 && directTextLength < totalTextLength * 0.2) return null;
    }

    // Skip table cells that are just spacing or very short structural text
    if ((tag === 'td' || tag === 'th') && len < 40) return null;

    // Skip tiny structural divs/spans (author info, labels, badges under 30 chars)
    if ((tag === 'div' || tag === 'span') && len < 40) {
      // Skip "Rating: X" style labels in product tables
      const textLower = text.toLowerCase();
      if (textLower.startsWith('rating') || textLower === 'excellent' || textLower === 'good' ||
          textLower === 'ok' || textLower === 'poor' || textLower === 'approved' ||
          textLower === 'editor\'s choice') return null;

      // Exception: allow if it has headline-like styling hints
      const className = (element.getAttribute('class') || '').toLowerCase();
      const style = (element.getAttribute('style') || '').toLowerCase();
      const headlineHints = className.includes('title') || className.includes('heading') ||
                            className.includes('headline') || className.includes('header') ||
                            style.includes('font-size: 2') || style.includes('font-size: 3') ||
                            style.includes('font-size:2') || style.includes('font-size:3') ||
                            style.includes('font-size: 18') || style.includes('font-size:18') ||
                            style.includes('font-size: 22') || style.includes('font-size:22');
      if (!headlineHints) return null;
    }

    // Classify based on text length and styling hints
    const className = (element.getAttribute('class') || '').toLowerCase();
    const style = (element.getAttribute('style') || '').toLowerCase();

    const headlineHints = className.includes('title') || className.includes('heading') ||
                          className.includes('headline') || className.includes('header') ||
                          style.includes('font-size: 2') || style.includes('font-size: 3') ||
                          style.includes('font-size:2') || style.includes('font-size:3') ||
                          style.includes('font-size: 18') || style.includes('font-size:18') ||
                          style.includes('font-size: 22') || style.includes('font-size:22');

    if (headlineHints && len < 150) return 'headline';
    if (len < 80) return 'subheadline';
    if (len >= 80) return 'paragraph';
  }

  return null;
}

// --- LABEL & ID GENERATION ---

function generateReadableLabel(text: string, type: SlotType, index: number): string {
  if (type === 'image') {
    return `Image ${index + 1}`;
  }
  // Use first 70 chars of original text as label
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= 70) return clean;
  // Cut at word boundary
  const cut = clean.substring(0, 70);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 40 ? cut.substring(0, lastSpace) : cut) + '...';
}

function generateSlotId(text: string, type: SlotType, existingIds: Set<string>): string {
  let baseId = '';

  if (type === 'image') {
    const alt = text || 'image';
    baseId = alt.toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 25);
  } else {
    baseId = text.toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 40);
  }

  // Clean up leading/trailing underscores
  baseId = baseId.replace(/^_+|_+$/g, '');

  if (!baseId || baseId.length < 2) {
    baseId = `${type}_${existingIds.size}`;
  }

  // Deduplicate
  let slotId = baseId;
  let counter = 1;
  while (existingIds.has(slotId)) {
    slotId = `${baseId}_${counter}`;
    counter++;
  }

  return slotId;
}

// --- MAIN DETECTION ---

export function detectSlots(htmlBody: string): DetectSlotsResult {
  if (!htmlBody || typeof htmlBody !== 'string') return { htmlBody: '', slots: [] };

  // Server-side safety check
  if (typeof DOMParser === 'undefined') {
    return { htmlBody: htmlBody || '', slots: [] };
  }

  let doc: Document;
  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(htmlBody, 'text/html');
  } catch (error) {
    console.error('Failed to parse template HTML');
    return { htmlBody, slots: [] };
  }

  const body = doc.body || doc.documentElement;
  const contentRoot = findMainContent(body);
  const slots: TemplateSlot[] = [];
  const usedIds = new Set<string>();

  // Query ALL potentially editable elements
  const selectors = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p',
    'ul', 'ol',
    'img', 'picture',
    'blockquote', 'figcaption',
    'button',
    'a',
    'div', 'span',
    'td', 'th',
  ].join(', ');

  const allElements = contentRoot.querySelectorAll(selectors);

  allElements.forEach((element) => {
    // Skip if already processed or inside junk
    if (element.hasAttribute('data-slot')) return;
    if (isInsideJunkContainer(element)) return;

    // Skip structural table cells (spacing, layout-only)
    if (element.tagName.toLowerCase() === 'td' || element.tagName.toLowerCase() === 'th') {
      const text = element.textContent?.trim() || '';
      // Skip cells that are just whitespace, &nbsp;, or very short
      if (text === '' || text === '\u00a0' || text === '&nbsp;') return;
    }

    // Skip script, style, noscript content
    if (element.closest('script, style, noscript, iframe')) return;

    // Skip elements inside a <ul> or <ol> that will be (or already is) captured as a list slot
    // This prevents individual <li>, <span>, <b>, <strong> inside list items from becoming separate slots
    const parentList = element.closest('ul, ol');
    if (parentList && element !== parentList) return;

    // Skip <a> tags if their parent <p> will be detected as a CTA
    // (prevents duplicate: both <p> and inner <a> becoming separate CTA slots)
    if (element.tagName.toLowerCase() === 'a') {
      const parentP = element.closest('p');
      if (parentP && parentP.querySelectorAll('a').length === 1 &&
          parentP.textContent?.trim() === element.textContent?.trim()) {
        return; // The parent <p> will handle this as a CTA
      }
    }

    const text = element.textContent?.trim() || '';

    // Skip junk text
    if (text && isJunkText(text)) return;

    // Classify
    const type = classifyElement(element, text);
    if (!type) return;

    // For images, handle separately
    if (type === 'image') {
      const src = element.getAttribute('src') || '';
      if (isJunkUrl(src)) return;
      if (!src && element.tagName.toLowerCase() !== 'picture') return;
    }

    // For CTAs, only keep if short action text
    if (type === 'cta') {
      if (text.length > 50 || text.length < 2) return;
    }

    // Generate ID and label
    const idText = type === 'image' ? (element.getAttribute('alt') || 'image') : text;
    const slotId = generateSlotId(idText, type, usedIds);
    usedIds.add(slotId);

    const label = generateReadableLabel(type === 'image' ? (element.getAttribute('alt') || `Image`) : text, type, slots.filter(s => s.type === type).length);

    // Capture original content
    let originalContent = text;
    let listTemplate: string | undefined;
    const tagName = element.tagName.toLowerCase();

    if (type === 'list') {
      const items = Array.from(element.querySelectorAll('li'));
      originalContent = items
        .map(li => li.textContent?.trim() || '')
        .filter(Boolean)
        .join('\n');

      // Detect list item styling pattern
      if (items.length > 0) {
        const firstLi = items[0];
        const firstLiHtml = firstLi.innerHTML;
        const firstLiText = firstLi.textContent || '';
        if (firstLiHtml.length > firstLiText.length + 10 || firstLi.children.length > 0) {
          listTemplate = firstLiHtml.replace(firstLiText.trim(), '{{CONTENT}}');
        }
      }
    } else if (type === 'image') {
      originalContent = element.getAttribute('src') || '';
    }

    // Determine max length from original content
    const maxLength = type === 'image' ? undefined :
                      type === 'cta' ? 50 :
                      type === 'headline' ? Math.max(originalContent.length * 2, 100) :
                      type === 'subheadline' ? Math.max(originalContent.length * 2, 80) :
                      type === 'list' ? Math.max(originalContent.length * 2, 500) :
                      Math.max(originalContent.length * 2, 200);

    // Get dimensions for images
    let width: number | undefined;
    let height: number | undefined;
    if (type === 'image') {
      const wAttr = element.getAttribute('width');
      const hAttr = element.getAttribute('height');
      if (wAttr) width = parseInt(wAttr, 10);
      if (hAttr) height = parseInt(hAttr, 10);

      const style = element.getAttribute('style') || '';
      const wMatch = style.match(/width:\s*(\d+)px/);
      const hMatch = style.match(/height:\s*(\d+)px/);
      if (!width && wMatch) width = parseInt(wMatch[1], 10);
      if (!height && hMatch) height = parseInt(hMatch[1], 10);
    }

    // Preserve non-slot attributes
    const attributes = Array.from(element.attributes)
      .filter(attr => !['data-slot', 'src', 'width', 'height'].includes(attr.name))
      .map(attr => `${attr.name}="${attr.value}"`)
      .join(' ');

    // Tag the element
    element.setAttribute('data-slot', slotId);

    slots.push({
      id: slotId,
      type,
      label,
      tagName,
      originalContent,
      maxLength,
      attributes,
      ...(width ? { width } : {}),
      ...(height ? { height } : {}),
      ...(listTemplate ? { listTemplate } : {}),
    });
  });

  // FALLBACK: If zero text slots detected, try a broader sweep
  if (slots.filter(s => s.type !== 'image').length === 0) {
    console.warn('⚠️ Zero text slots detected. Running fallback detection on all text nodes...');

    const allDivs = contentRoot.querySelectorAll('*');
    allDivs.forEach((element) => {
      if (element.hasAttribute('data-slot')) return;
      if (element.closest('script, style, noscript, iframe, nav, footer, header')) return;

      const text = element.textContent?.trim() || '';
      if (text.length < 20) return;

      // Only leaf elements (no children with substantial text)
      const hasTextChildren = Array.from(element.children).some(
        child => (child.textContent?.trim().length || 0) > 15
      );
      if (hasTextChildren) return;

      const slotId = generateSlotId(text, 'paragraph', usedIds);
      usedIds.add(slotId);

      element.setAttribute('data-slot', slotId);

      slots.push({
        id: slotId,
        type: 'paragraph',
        label: generateReadableLabel(text, 'paragraph', slots.length),
        tagName: element.tagName.toLowerCase(),
        originalContent: text,
        maxLength: Math.max(text.length * 2, 200),
      });
    });

    if (slots.length > 0) {
      console.log(`✅ Fallback detected ${slots.length} slots`);
    } else {
      console.warn('❌ No slots detected even with fallback. Template may have no editable content.');
    }
  }

  return {
    htmlBody: contentRoot.innerHTML,
    slots,
  };
}
