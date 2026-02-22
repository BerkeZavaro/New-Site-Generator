/**
 * Utility functions to extract image metadata from templates
 * Updated to parse CSS inline styles for dimensions.
 */

export interface ImageMetadata {
  src?: string;
  width?: number;
  height?: number;
  alt?: string;
  className?: string;
  context?: string;
}

export function extractImageMetadata(htmlBody: string, slotId: string): ImageMetadata | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlBody, "text/html");
    const imgElement = doc.querySelector(`img[data-slot="${slotId}"]`) as HTMLImageElement;

    if (!imgElement) {
      return null;
    }

    const metadata: ImageMetadata = {
      src: imgElement.src || imgElement.getAttribute("src") || undefined,
      alt: imgElement.alt || undefined,
      className: imgElement.className || undefined,
    };

    // 1. Attribute Detection
    const widthAttr = imgElement.getAttribute("width");
    const heightAttr = imgElement.getAttribute("height");

    if (widthAttr) metadata.width = parseInt(widthAttr, 10);
    if (heightAttr) metadata.height = parseInt(heightAttr, 10);

    // 2. Inline Style Detection (The Missing Link)
    // Browsers often put dimensions in 'style' attribute like "width: 200px;"
    if (!metadata.width || !metadata.height) {
      const style = imgElement.getAttribute("style") || "";
      const wMatch = style.match(/width:\s*(\d+)px/i);
      const hMatch = style.match(/height:\s*(\d+)px/i);

      if (!metadata.width && wMatch) metadata.width = parseInt(wMatch[1], 10);
      if (!metadata.height && hMatch) metadata.height = parseInt(hMatch[1], 10);
    }

    // Extract context
    const parent = imgElement.parentElement;
    if (parent) {
      let current: Element | null = parent;
      for (let i = 0; i < 3 && current; i++) {
        const heading = current.querySelector("h1, h2, h3, h4, h5, h6");
        if (heading) {
          metadata.context = heading.textContent?.trim() || undefined;
          break;
        }
        current = current.parentElement;
      }

      if (!metadata.context && parent.textContent) {
        const text = parent.textContent.trim();
        if (text.length > 0) {
          metadata.context = text.substring(0, 50).replace(/\s+/g, " ");
        }
      }
    }

    return metadata;
  } catch (error) {
    console.error("Error extracting image metadata:", error);
    return null;
  }
}

export function extractAllImageMetadata(htmlBody: string, imageSlotIds: string[]): Record<string, ImageMetadata> {
  const metadata: Record<string, ImageMetadata> = {};
  for (const slotId of imageSlotIds) {
    const imgMetadata = extractImageMetadata(htmlBody, slotId);
    if (imgMetadata) {
      metadata[slotId] = imgMetadata;
    }
  }
  return metadata;
}
