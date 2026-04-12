import type { TemplateConfig } from '@/lib/templates/types';

interface MergeRequest {
  template: TemplateConfig;
  textData: Record<string, string>;
  imageData: Record<string, string>;
}

export function mergeHtml(request: MergeRequest): string {
  if (typeof DOMParser === 'undefined') {
    console.warn('mergeHtml: DOMParser not available (server-side). Returning raw HTML.');
    return request.template.htmlBody || '';
  }
  const { template, textData, imageData } = request;

  if (!template.htmlBody) return '';
  // 1. Parse the Master Shell
  let doc: Document;
  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(template.htmlBody, 'text/html');
  } catch (e) {
    console.error("Failed to parse template HTML");
    return template.htmlBody;
  }
  // 2. Inject Content
  template.slots.forEach(slot => {
    const element = doc.querySelector(`[data-slot="${slot.id}"]`);
    if (!element) return;

    // --- TEXT INJECTION ---
    if (textData[slot.id] && slot.type !== 'image') {
      if (slot.type === 'list') {
        const items = textData[slot.id].split('\n').filter(i => i.trim());

        if (slot.listTemplate && slot.listTemplate.includes('{{CONTENT}}')) {
          const htmlItems = items.map(item => {
            const cleanItemText = item.replace(/^[\d+\.•*\-]+\s*/, '');
            const styledContent = slot.listTemplate!.replace('{{CONTENT}}', cleanItemText);
            return `<li>${styledContent}</li>`;
          }).join('');
          element.innerHTML = htmlItems;
        } else {
          const htmlItems = items.map(item => {
            const cleanItemText = item.replace(/^[\d+\.•*\-]+\s*/, '');
            return `<li>${cleanItemText}</li>`;
          }).join('');
          element.innerHTML = htmlItems;
        }
      } else if (slot.type === 'cta') {
        // For CTAs (buttons, links), update text but preserve the element and its href
        element.textContent = textData[slot.id];
      } else {
        // Headlines, subheadlines, paragraphs — works for any element type
        // (p, div, span, h1-h6, blockquote, figcaption, td, th, etc.)
        element.textContent = textData[slot.id];
      }
    }

    // --- IMAGE INJECTION & CLEANING ---
    if (slot.type === 'image') {
      let finalSrc = '';

      // Priority 1: User provided a new image
      if (imageData[slot.id]) {
        finalSrc = imageData[slot.id];
      } else {
        // Priority 2: Fallback to original, but check for junk
        const imgElement = element.tagName.toLowerCase() === 'img' ? element :
                           element.querySelector('img');
        const originalSrc = imgElement?.getAttribute('src') || element.getAttribute('src') || '';

        if (isJunkUrl(originalSrc)) {
          const w = slot.width || 300;
          const h = slot.height || 200;
          finalSrc = `https://placehold.co/${w}x${h}?text=Missing+Image`;
        } else {
          finalSrc = originalSrc;
        }
      }

      if (finalSrc) {
        // Handle both <img> directly and <picture> or wrapper elements
        const imgElement = element.tagName.toLowerCase() === 'img' ? element :
                           element.querySelector('img');
        if (imgElement) {
          imgElement.setAttribute('src', finalSrc);
          imgElement.removeAttribute('srcset');
        } else {
          element.setAttribute('src', finalSrc);
          element.removeAttribute('srcset');
        }
      }
    }
  });

  // 3. Serialize back to HTML
  return doc.documentElement.outerHTML;
}

function isJunkUrl(url: string): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();

  return (
    lower.includes('googletagmanager.com') ||
    lower.includes('file://') ||
    lower.includes('_files/') ||
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('%20')
  );
}
