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
    console.error('Failed to parse template HTML');
    return template.htmlBody;
  }

  // 2. Inject Content
  template.slots.forEach(slot => {
    const element = doc.querySelector(`[data-slot="${slot.id}"]`);
    if (!element) return;

    // Handle Text Injection
    if (textData[slot.id]) {
      if (slot.type === 'list') {
        const items = textData[slot.id].split('\n').filter(i => i.trim());
        const htmlItems = items.map(item => `<li>${item.replace(/^[•*-]\s*/, '')}</li>`).join('');
        element.innerHTML = htmlItems;
      } else {
        element.textContent = textData[slot.id];
      }
    }

    // Handle Image Injection
    if (slot.type === 'image' && imageData[slot.id]) {
      element.setAttribute('src', imageData[slot.id]);
    }
  });

  // 3. Serialize back to HTML
  return doc.documentElement.outerHTML;
}
