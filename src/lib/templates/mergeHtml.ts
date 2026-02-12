import type { TemplateConfig } from '@/lib/templates/types';

interface MergeRequest {
  template: TemplateConfig;
  textData: Record<string, string>;
  imageData: Record<string, string>;
}

export function mergeHtml(request: MergeRequest): string {
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
    if (textData[slot.id]) {
      if (slot.type === 'list') {
        const items = textData[slot.id].split('\n').filter(i => i.trim());

        // Smart List Styling: Check if we saved a pattern (like checkmarks)
        if (slot.listTemplate && slot.listTemplate.includes('{{CONTENT}}')) {
          const htmlItems = items.map(item => {
            const cleanItemText = item.replace(/^[\d+\.•*-]+\s*/, '');
            const styledContent = slot.listTemplate!.replace('{{CONTENT}}', cleanItemText);
            return `<li>${styledContent}</li>`;
          }).join('');
          element.innerHTML = htmlItems;
        } else {
          const htmlItems = items.map(item => {
            const cleanItemText = item.replace(/^[\d+\.•*-]+\s*/, '');
            return `<li>${cleanItemText}</li>`;
          }).join('');
          element.innerHTML = htmlItems;
        }
      } else {
        // Normal text (Headlines, Paragraphs)
        element.textContent = textData[slot.id];
      }
    }

    // --- IMAGE INJECTION & CLEANING ---
    if (slot.type === 'image') {
      let finalSrc = '';

      // Priority 1: User provided a new image in Image Studio
      if (imageData[slot.id]) {
        finalSrc = imageData[slot.id];
      } else {
        // Priority 2: Fallback to original, BUT CHECK FOR JUNK
        const originalSrc = element.getAttribute('src') || '';

        if (isJunkUrl(originalSrc)) {
          const w = slot.width || 300;
          const h = slot.height || 200;
          finalSrc = `https://placehold.co/${w}x${h}?text=Missing+Image`;
        } else {
          finalSrc = originalSrc;
        }
      }

      if (finalSrc) {
        element.setAttribute('src', finalSrc);
        // CRITICAL: Remove 'srcset' to prevent broken local paths from overriding
        element.removeAttribute('srcset');
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
