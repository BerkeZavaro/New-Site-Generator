import type { UploadedTemplate } from '@/lib/templates/uploadedTypes';

export type StaticFile = {
  path: string;
  contents: string;
};

function escapeMarkdown(text: string): string {
  return text.replace(/^(#{1,6}\s)/gm, '\\$1').replace(/^```/gm, '\\`\\`\\`');
}

export function buildReadyToEditExport(template: UploadedTemplate): StaticFile[] {
  const files: StaticFile[] = [];
  
  // Build content.md — each slot is a section with a heading
  const markdownSections: string[] = [];
  markdownSections.push(`# ${template.name}`);
  markdownSections.push('');
  markdownSections.push('> Edit the content under each heading. Keep the `## slot:` headings exactly as they are. Save this file and refresh the preview in your browser.');
  markdownSections.push('');
  markdownSections.push('---');
  markdownSections.push('');
  
  template.slots.forEach((slot) => {
    const originalContent = slot.originalContent || '';
    const typeLabel = slot.type.toUpperCase();
    
    markdownSections.push(`## slot: ${slot.id}`);
    markdownSections.push(`*Type: ${typeLabel} | Label: ${slot.label}*`);
    markdownSections.push('');
    
    if (slot.type === 'image') {
      markdownSections.push(`<!-- Image URL — paste an image URL or keep the original -->`);
      markdownSections.push(originalContent || '');
    } else if (slot.type === 'list') {
      markdownSections.push(`<!-- One item per line -->`);
      markdownSections.push(escapeMarkdown(originalContent));
    } else {
      markdownSections.push(escapeMarkdown(originalContent));
    }
    
    markdownSections.push('');
    markdownSections.push('---');
    markdownSections.push('');
  });
  
  const markdownContent = markdownSections.join('\n');
  
  // Build index.html with injection script
  const headContent = template.headContent || '';
  const inlineCss = template.css || '';
  
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.name}</title>
  ${headContent}
  ${inlineCss ? `<style>${inlineCss}</style>` : ''}
  <style>
    [data-slot]:hover { outline: 2px dashed #3b82f6; outline-offset: 2px; }
    #__content_status__ {
      position: fixed; bottom: 12px; right: 12px;
      padding: 8px 14px; background: #1e293b; color: #fff;
      font-family: -apple-system, sans-serif; font-size: 12px;
      border-radius: 6px; z-index: 999999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2); cursor: pointer;
    }
    #__content_status__.error { background: #dc2626; }
    #__content_status__.success { background: #16a34a; }
  </style>
</head>
<body>
${template.htmlBody}

<div id="__content_status__">Loading content.md...</div>

<script>
(function() {
  'use strict';
  var statusEl = document.getElementById('__content_status__');
  function setStatus(msg, type) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = type || '';
  }
  function parseMarkdown(text) {
    var slots = {};
    var sections = text.split(/^## slot:\\s*/m);
    for (var i = 1; i < sections.length; i++) {
      var section = sections[i];
      var endOfFirstLine = section.indexOf('\\n');
      if (endOfFirstLine === -1) continue;
      var slotId = section.substring(0, endOfFirstLine).trim();
      var content = section.substring(endOfFirstLine + 1);
      content = content.replace(/^\\s*\\*Type:.*?\\*\\s*\\n/, '');
      content = content.replace(/<!--[\\s\\S]*?-->/g, '');
      content = content.replace(/\\n---\\s*$/, '');
      content = content.replace(/^\\\\(#{1,6}\\s)/gm, '$1');
      content = content.trim();
      slots[slotId] = content;
    }
    return slots;
  }
  function applySlotContent(slots) {
    var count = 0;
    Object.keys(slots).forEach(function(slotId) {
      var el = document.querySelector('[data-slot="' + slotId.replace(/"/g, '\\\\"') + '"]');
      if (!el) return;
      var content = slots[slotId];
      if (!content) return;
      var tag = el.tagName.toLowerCase();
      if (tag === 'img') {
        el.setAttribute('src', content);
      } else if (tag === 'ul' || tag === 'ol') {
        var items = content.split('\\n').map(function(l) { return l.trim(); })
          .filter(function(l) { return l.length > 0; })
          .map(function(l) { return l.replace(/^[-*•]\\s+/, '').replace(/^\\d+[\\.)]\\s+/, ''); });
        el.innerHTML = items.map(function(i) { return '<li>' + i + '</li>'; }).join('');
      } else {
        el.textContent = content;
      }
      count++;
    });
    return count;
  }
  function loadContent() {
    setStatus('Loading content.md...');
    fetch('content.md?t=' + Date.now())
      .then(function(res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.text(); })
      .then(function(text) {
        var slots = parseMarkdown(text);
        var count = applySlotContent(slots);
        setStatus('✓ ' + count + ' slots loaded — refresh to reload', 'success');
      })
      .catch(function(err) {
        console.error('Failed to load content.md:', err);
        setStatus('⚠ Cannot load content.md — see README.md', 'error');
      });
  }
  if (statusEl) statusEl.addEventListener('click', function() { statusEl.style.display = 'none'; });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadContent);
  } else {
    loadContent();
  }
})();
</script>

</body>
</html>`;
  
  const readme = `# ${template.name} — Ready-to-Edit Template

Edit \`content.md\` to customize this page. The HTML layout is already done — you just need to replace the text.

## Files
- **content.md** ← Edit this. All your text lives here.
- **index.html** ← The page template. Don't edit unless changing design.
- **README.md** ← This file.

## How to edit

1. Open this folder in VS Code (File → Open Folder)
2. Install the "Live Preview" extension by Microsoft (one-time)
3. Right-click \`index.html\` → "Show Preview"
4. Open \`content.md\` and edit the text under each \`## slot:\` heading
5. Save (Ctrl+S) → refresh the preview

**Important:** Don't rename or delete the \`## slot: xxx\` lines — they connect the text to the page.

## Common issues

**"Cannot load content.md":** You opened index.html directly. Use VS Code's Live Preview instead (browsers block local file reads for security).

**Changes not showing:** Did you save content.md? Refresh the preview window.

---

Slots: ${template.slots.length}
Source: ${template.description || 'Uploaded template'}
`;
  
  files.push({ path: 'index.html', contents: htmlContent });
  files.push({ path: 'content.md', contents: markdownContent });
  files.push({ path: 'README.md', contents: readme });
  
  return files;
}
