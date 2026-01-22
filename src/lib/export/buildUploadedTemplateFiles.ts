import type { UploadedTemplate } from "@/lib/templates/uploadedTypes";
import type { StaticFile } from "./buildCreatineReportFiles";

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

  // Build complete HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.name}</title>
  <style>
${css}
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

  return [
    { path: "index.html", contents: html },
    { path: "styles.css", contents: css },
  ];
}
