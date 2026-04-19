import type { UploadedTemplate } from "@/lib/templates/uploadedTypes";
import type { StaticFile } from "./buildCreatineReportFiles";

/** HTML void elements — used when stripping extension-injected subtrees. */
const VOID_HTML_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
  "param", "source", "track", "wbr",
]);

function hasPasswordManagerExtensionAttr(openTag: string): boolean {
  return (
    /\sdata-lastpass-/i.test(openTag) ||
    /\sdata-1p-/i.test(openTag) ||
    /\sdata-bitwarden-/i.test(openTag)
  );
}

/**
 * Parse a single opening tag starting at `start` (`<` index). Returns end index past `>`.
 */
function parseOpeningTag(
  html: string,
  start: number
): { end: number; tagName: string; voidTag: boolean } | null {
  if (html[start] !== "<") return null;
  const n1 = html[start + 1];
  if (!n1 || n1 === "/" || n1 === "!" || n1 === "?") return null;
  let i = start + 1;
  while (i < html.length && /\s/.test(html[i]!)) i++;
  const nameStart = i;
  while (i < html.length && /[\w:-]/.test(html[i]!)) i++;
  const tagName = html.slice(nameStart, i);
  if (!tagName) return null;

  let quote: "'" | '"' | null = null;
  while (i < html.length) {
    const c = html[i]!;
    if (quote) {
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      i++;
      continue;
    }
    if (c === ">") {
      const slice = html.slice(start, i + 1);
      const voidTag =
        VOID_HTML_TAGS.has(tagName.toLowerCase()) || /\/\s*>$/.test(slice);
      return { end: i + 1, tagName, voidTag };
    }
    i++;
  }
  return null;
}

/** Find the end index of the matching `</tagName>` for a non-void element opened before `from`. */
function findMatchingCloseTagEnd(html: string, from: number, tagName: string): number {
  const target = tagName.toLowerCase();
  let depth = 1;
  let i = from;
  while (i < html.length && depth > 0) {
    const lt = html.indexOf("<", i);
    if (lt === -1) return html.length;
    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html[lt + 1] === "/") {
      const cm = /^<\/([\w:-]+)\s*>/i.exec(html.slice(lt));
      if (cm) {
        if (cm[1].toLowerCase() === target) {
          depth--;
          if (depth === 0) return lt + cm[0].length;
        }
        i = lt + cm[0].length;
        continue;
      }
      i = lt + 2;
      continue;
    }
    const po = parseOpeningTag(html, lt);
    if (po && po.tagName.toLowerCase() === target && !po.voidTag) {
      depth++;
      i = po.end;
      continue;
    }
    if (po) {
      i = po.end;
      continue;
    }
    i = lt + 1;
  }
  return html.length;
}

function findFirstExtensionArtifactRange(html: string): { start: number; end: number } | null {
  let pos = 0;
  while (pos < html.length) {
    const lt = html.indexOf("<", pos);
    if (lt === -1) return null;
    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      pos = end === -1 ? html.length : end + 3;
      continue;
    }
    const po = parseOpeningTag(html, lt);
    if (!po) {
      pos = lt + 1;
      continue;
    }
    const openSlice = html.slice(lt, po.end);
    if (!hasPasswordManagerExtensionAttr(openSlice)) {
      pos = po.end;
      continue;
    }
    if (po.voidTag) return { start: lt, end: po.end };
    const end = findMatchingCloseTagEnd(html, po.end, po.tagName);
    return { start: lt, end };
  }
  return null;
}

/** Remove `<template shadowrootmode="...">...</template>` blocks (browser extension). */
function stripShadowRootTemplates(html: string): string {
  let prev = "";
  let out = html;
  let guard = 0;
  while (prev !== out && guard++ < 50) {
    prev = out;
    out = out.replace(
      /<template\b[^>]*\bshadowrootmode\s*=\s*(["'])[^"']*\1[^>]*>[\s\S]*?<\/template>/gi,
      ""
    );
  }
  return out;
}

function stripPasswordManagerExtensionElements(html: string): string {
  let out = html;
  let guard = 0;
  while (guard++ < 500) {
    const range = findFirstExtensionArtifactRange(out);
    if (!range) break;
    out = out.slice(0, range.start) + out.slice(range.end);
  }
  return out;
}

function elementDepthWithin(el: Element, root: Element): number {
  let d = 0;
  let x: Element | null = el;
  while (x && x !== root) {
    d++;
    x = x.parentElement;
  }
  return d;
}

function hasExtensionPasswordManagerAttr(el: Element): boolean {
  for (const name of el.getAttributeNames()) {
    const lower = name.toLowerCase();
    if (
      lower.startsWith("data-lastpass-") ||
      lower.startsWith("data-1p-") ||
      lower.startsWith("data-bitwarden-")
    ) {
      return true;
    }
  }
  return false;
}

function hasShadowRootModeAttr(el: Element): boolean {
  for (const name of el.getAttributeNames()) {
    if (name.toLowerCase() === "shadowrootmode") return true;
  }
  return false;
}

/**
 * Remove password-manager extension DOM and declarative shadow templates.
 * Prefers DOMParser (handles nesting); falls back to string scanners when DOMParser is unavailable (e.g. Node during export).
 */
function stripBrowserExtensionArtifacts(html: string): string {
  if (typeof DOMParser === "undefined") {
    let out = stripShadowRootTemplates(html);
    out = stripPasswordManagerExtensionElements(out);
    return out;
  }
  try {
    const parser = new DOMParser();
    const wrapped = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
    const doc = parser.parseFromString(wrapped, "text/html");
    const body = doc.body;
    if (!body) {
      let out = stripShadowRootTemplates(html);
      out = stripPasswordManagerExtensionElements(out);
      return out;
    }

    const shadowTemplates: Element[] = [];
    body.querySelectorAll("template").forEach((el) => {
      if (hasShadowRootModeAttr(el)) shadowTemplates.push(el);
    });
    shadowTemplates.forEach((el) => el.remove());

    let guard = 0;
    while (guard++ < 500) {
      const hits: Element[] = [];
      body.querySelectorAll("*").forEach((el) => {
        if (hasExtensionPasswordManagerAttr(el)) hits.push(el);
      });
      if (hits.length === 0) break;
      hits.sort((a, b) => elementDepthWithin(b, body) - elementDepthWithin(a, body));
      hits.forEach((el) => {
        if (body.contains(el)) el.remove();
      });
    }

    return body.innerHTML;
  } catch {
    let out = stripShadowRootTemplates(html);
    out = stripPasswordManagerExtensionElements(out);
    return out;
  }
}

function stripDataSlotAttributes(html: string): string {
  return html
    .replace(/\s+data-slot="[^"]*"/g, "")
    .replace(/\s+data-slot='[^']*'/g, "");
}

/**
 * Inner HTML of `<body>` only; strips leading DOCTYPE if present.
 * If the string has no `<body>` (already a fragment), returns trimmed input after optional DOCTYPE strip.
 */
function extractBodyInnerHtml(fullDocument: string): string {
  let s = fullDocument.trim();
  s = s.replace(/^\s*<!DOCTYPE[^>]*>\s*/i, "");
  const m = s.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (m) return m[1]!.trim();
  return s.trim();
}

/**
 * Final-stage cleanup for static HTML (uploaded template) export: body fragment only,
 * no data-slot, no password-manager extension DOM.
 * Runs after slot injection in the builder; mergeHtml is not used on this export path.
 */
function sanitizeStaticHtmlBodyExport(fullDocument: string): string {
  let fragment = extractBodyInnerHtml(fullDocument);
  fragment = stripBrowserExtensionArtifacts(fragment);
  fragment = stripDataSlotAttributes(fragment);
  return fragment.trim();
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export function buildUploadedTemplateFiles(
  template: UploadedTemplate,
  slotData: Record<string, string>
): StaticFile[] {
  let bodyHtml = template.htmlBody;

  // Replace slot content using regex (server-side compatible)
  // This approach preserves the original element structure, classes, IDs, and attributes
  template.slots.forEach((slot) => {
    const slotContent = slotData[slot.id] || "";
    const escapedContent = escapeHtml(slotContent);
    
    // Find elements with data-slot attribute using regex
    // Pattern: <tag ... data-slot="slotId" ...>content</tag>
    const slotIdPattern = slot.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Match opening tag with data-slot attribute - capture the FULL opening tag with all attributes
    const tagPattern = new RegExp(
      `(<([^>\\s]+)[^>]*data-slot=["']${slotIdPattern}["'][^>]*>)([\\s\\S]*?)(</\\2>)`,
      'gi'
    );
    
    bodyHtml = bodyHtml.replace(tagPattern, (match, openTag, tagName, oldContent, closeTag) => {
      // tagName is captured from the opening tag, closeTag matches it
      const tagNameLower = tagName.toLowerCase();
      
      if (slot.type === "list" || (tagNameLower === "ul" || tagNameLower === "ol")) {
        // For lists, preserve the opening tag (with all attributes) and create list items
        const items = slotContent
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
        if (items.length > 0) {
          // Preserve the original opening tag structure (classes, IDs, styles, etc.)
          return openTag + items.map((item) => `<li>${escapeHtml(item)}</li>`).join("") + closeTag;
        }
        return openTag + closeTag;
      } else if (slot.type === "image" && tagNameLower === "img") {
        // For images, preserve the opening tag and only update src attribute
        // Keep all other attributes (class, id, style, alt, etc.)
        const updatedTag = openTag.replace(
          /(src=["'])([^"']*)(["'])/i,
          `$1${escapedContent}$3`
        );
        // Also update alt if content is provided
        if (slotContent) {
          return updatedTag.replace(
            /(alt=["'])([^"']*)(["'])/i,
            `$1${escapedContent}$3`
          );
        }
        return updatedTag;
      } else if (slot.type === "cta" && tagNameLower === "a") {
        // For links/CTAs, preserve the opening tag and only update href attribute
        const updatedTag = openTag.replace(
          /(href=["'])([^"']*)(["'])/i,
          `$1${escapedContent}$3`
        );
        // Preserve the link text/content
        return updatedTag + oldContent + closeTag;
      } else if (tagNameLower.match(/^h[1-6]$/)) {
        // For headings (h1-h6), preserve the element and only update text content
        // This preserves classes, IDs, inline styles, and all attributes
        return openTag + escapedContent + closeTag;
      } else if (tagNameLower === "p") {
        // For paragraphs, preserve the element and only update text content
        return openTag + escapedContent + closeTag;
      } else if (tagNameLower === "div" || tagNameLower === "section" || tagNameLower === "article") {
        // For content blocks (DIVs/SECTIONS), replace inner content with paragraphs
        // Split content by double newlines to create multiple paragraphs
        const paragraphs = slotContent.split(/\n\n+/).filter(p => p.trim());
        if (paragraphs.length > 0) {
          const paragraphHtml = paragraphs.map(para => `<p>${escapeHtml(para.trim())}</p>`).join("");
          return openTag + paragraphHtml + closeTag;
        } else {
          // Single paragraph or no content
          return openTag + (slotContent.trim() ? `<p>${escapedContent}</p>` : "") + closeTag;
        }
      } else {
        // For other elements (span, etc.), preserve the element structure
        // Only replace the inner content, keeping all attributes intact
        return openTag + escapedContent + closeTag;
      }
    });
  });

  const css = template.css || "";
  const headContent = (template as { headContent?: string }).headContent || "";

  // Build complete HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.name}</title>
  ${headContent}
  ${css ? `<style>\n${css}\n  </style>` : ""}
</head>
<body>
${bodyHtml}
</body>
</html>`;

  const indexContents = sanitizeStaticHtmlBodyExport(html);

  return [
    { path: "index.html", contents: indexContents },
    { path: "styles.css", contents: css },
  ];
}
