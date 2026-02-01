/**
 * Resolves relative URLs in scraped HTML to absolute URLs.
 * Fixes broken images and styles when HTML is saved from a website and contains
 * relative paths like src="/image.png" or href="/styles.css".
 */

/** Attributes that may contain URLs needing resolution */
const URL_ATTRIBUTES = ['src', 'href', 'data-src', 'poster'] as const;

/** Elements that typically have src or href with resource URLs */
const ELEMENTS_WITH_URLS = ['img', 'link', 'script', 'a', 'source', 'video', 'audio'];

function isRelativeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith('/') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../') ||
    (!trimmed.startsWith('http://') &&
      !trimmed.startsWith('https://') &&
      !trimmed.startsWith('data:') &&
      !trimmed.startsWith('blob:') &&
      !trimmed.startsWith('mailto:') &&
      !trimmed.startsWith('tel:'))
  );
}

/**
 * Resolve a potentially relative URL against a base URL.
 */
function resolveUrl(url: string, baseUrl: string): string {
  if (!url || !baseUrl) return url;
  const trimmed = url.trim();
  if (!isRelativeUrl(trimmed)) return url;
  try {
    return new URL(trimmed, baseUrl).href;
  } catch {
    return url;
  }
}

/**
 * Extract base URL from HTML <base href="..."> if present.
 */
function extractBaseFromHtml(html: string): string | null {
  const match = html.match(/<base\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/i);
  if (match) {
    try {
      const base = match[1].trim();
      if (base.startsWith('http')) return base;
      return null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Extract base URL from the first absolute URL found in the document (img src, link href, etc.).
 * Useful when HTML has no <base> tag but contains absolute URLs from the same origin.
 */
function extractBaseFromAbsoluteUrls(html: string): string | null {
  const urlMatch = html.match(/(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)["']/i);
  if (urlMatch) {
    try {
      const url = new URL(urlMatch[1]);
      return `${url.protocol}//${url.host}/`;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Convert all relative URLs in HTML to absolute URLs using the given base URL.
 * Handles: img src, link href (stylesheets), script src, a href, source src, etc.
 *
 * @param html - Raw HTML string (full document or fragment)
 * @param baseUrl - The source URL of the page (e.g. "https://example.com/page")
 * @returns HTML with relative URLs resolved to absolute
 */
export function resolveUrlsInHtml(html: string, baseUrl?: string): string {
  if (!html || typeof html !== 'string') return html;

  let effectiveBase = baseUrl?.trim();
  if (!effectiveBase) {
    effectiveBase = extractBaseFromHtml(html) || extractBaseFromAbsoluteUrls(html) || undefined;
  }
  if (!effectiveBase) {
    return html; // No base URL - cannot resolve
  }

  // Ensure base URL has protocol for proper resolution
  if (!effectiveBase.startsWith('http://') && !effectiveBase.startsWith('https://')) {
    effectiveBase = 'https://' + effectiveBase.replace(/^\/+/, '');
  }
  try {
    new URL(effectiveBase); // Validate
  } catch {
    return html;
  }

  // Use DOM parsing when available (browser)
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const processElement = (el: Element) => {
        for (const attr of URL_ATTRIBUTES) {
          const val = el.getAttribute(attr);
          if (val && isRelativeUrl(val)) {
            el.setAttribute(attr, resolveUrl(val, effectiveBase!));
          }
        }
      };

      doc.querySelectorAll(ELEMENTS_WITH_URLS.join(',')).forEach(processElement);
      // Handle url() in <style> blocks and inline styles
      const resolveUrlInCss = (css: string) =>
        css.replace(/url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi, (_, url) => {
          const trimmed = url.trim();
          if (isRelativeUrl(trimmed)) {
            return `url("${resolveUrl(trimmed, effectiveBase!)}")`;
          }
          return `url("${url}")`;
        });
      doc.querySelectorAll('style').forEach((el) => {
        if (el.textContent) {
          el.textContent = resolveUrlInCss(el.textContent);
        }
      });
      doc.querySelectorAll('[style]').forEach((el) => {
        const style = el.getAttribute('style');
        if (style && style.includes('url(')) {
          el.setAttribute('style', resolveUrlInCss(style));
        }
      });

      if (typeof XMLSerializer !== 'undefined') {
        const serializer = new XMLSerializer();
        let result = serializer.serializeToString(doc);
        result = result.replace(/^<\?xml[^?]*\?>\s*/i, '');
        return result;
      }
      return doc.documentElement?.outerHTML ?? html;
    } catch (e) {
      console.warn('urlResolver: DOM parse failed, falling back to regex', e);
    }
  }

  // Fallback: regex-based replacement (works in Node.js)
  return html.replace(
    /(<(?:img|link|script|a|source|video|audio)\s[^>]*)(\s(?:src|href|data-src|poster)\s*=\s*["'])([^"']+)(["'][^>]*>)/gi,
    (_, before, attrPart, url, after) => {
      if (isRelativeUrl(url)) {
        return before + attrPart + resolveUrl(url, effectiveBase!) + after;
      }
      return before + attrPart + url + after;
    }
  ).replace(
    /(url\s*\(\s*["']?)([^"')]+)(["']?\s*\))/gi,
    (_, before, url, after) => {
      const trimmed = url.trim();
      if (isRelativeUrl(trimmed)) {
        return before + resolveUrl(trimmed, effectiveBase!) + after;
      }
      return before + url + after;
    }
  );
}

/**
 * Extract head content (link stylesheets and style blocks) from full HTML.
 * Preserves styles when only body is stored - inject when rendering.
 */
export function extractHeadContent(html: string): string {
  if (!html || typeof html !== 'string') return '';
  if (typeof DOMParser === 'undefined') return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const head = doc.head;
    if (!head) return '';
    const parts: string[] = [];
    head.querySelectorAll('link[rel="stylesheet"], style').forEach((el) => {
      const outer = el.outerHTML;
      if (outer) parts.push(outer);
    });
    return parts.join('\n');
  } catch {
    return '';
  }
}
