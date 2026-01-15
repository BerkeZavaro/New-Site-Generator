"use client";

import React, { useEffect, useState } from "react";
import type { UploadedTemplate } from "@/lib/templates/uploadedTypes";

interface UploadedTemplateRendererProps {
  template: UploadedTemplate;
  slotData: Record<string, string>; // slotId -> content
}

export function UploadedTemplateRenderer({ template, slotData }: UploadedTemplateRendererProps) {
  const [renderedHtml, setRenderedHtml] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Inject CSS first (separate effect to ensure it's loaded)
  useEffect(() => {
    const styleId = `uploaded-template-${template.id}-styles`;
    let style = document.getElementById(styleId) as HTMLStyleElement;
    
    if (template.css) {
      if (!style) {
        style = document.createElement("style");
        style.id = styleId;
        document.head.appendChild(style);
      }
      style.textContent = template.css;
    } else if (style) {
      style.remove();
    }

    return () => {
      // Keep style for reuse - don't remove on unmount
    };
  }, [template.css, template.id]);

  // Process HTML and replace slot content
  useEffect(() => {
    // Replace slot content in HTML
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(template.htmlBody, "text/html");
      const parseError = doc.querySelector("parsererror");
      
      if (parseError) {
        setError("HTML structure appears to be invalid or incomplete");
        return;
      }

      // Replace content in elements with data-slot attributes
      template.slots.forEach((slot) => {
        const slotContent = slotData[slot.id] || "";
        const elements = doc.querySelectorAll(`[data-slot="${slot.id}"]`);
        
        elements.forEach((el) => {
          // For text/list slots, replace innerHTML or textContent
          if (slot.type === "text" || slot.type === "list") {
            // Check if this is a heading element (h1, h2, h3, etc.)
            if (el.tagName.match(/^H[1-6]$/)) {
              // For headings, preserve the element and just update text content
              // This preserves classes, IDs, inline styles, and all attributes
              el.textContent = slotContent;
            }
            // Check if this is a section container (div with heading inside)
            else if (el.classList.contains("template-section-group")) {
              // For section containers, preserve the heading and replace only content
              const heading = el.querySelector("h1, h2, h3, h4, h5, h6");
              const contentElements = Array.from(el.children).filter(
                child => child !== heading && 
                (child.tagName === "P" || child.tagName === "UL" || child.tagName === "OL" || 
                 child.tagName === "DIV" || child.tagName === "BLOCKQUOTE")
              );
              
              // Remove old content elements
              contentElements.forEach(child => child.remove());
              
              // Add new content as paragraphs (split by double newlines or keep as single block)
              if (slotContent.trim()) {
                const paragraphs = slotContent.split(/\n\n+/).filter(p => p.trim());
                if (paragraphs.length > 0) {
                  paragraphs.forEach(para => {
                    // Find the first paragraph element in the original to clone its structure
                    const firstPara = contentElements.find(child => child.tagName === "P") as HTMLParagraphElement;
                    const p = firstPara ? firstPara.cloneNode(false) as HTMLParagraphElement : doc.createElement("p");
                    p.innerHTML = para.trim(); // Use innerHTML to support HTML formatting
                    if (heading && heading.nextSibling) {
                      el.insertBefore(p, heading.nextSibling);
                    } else {
                      el.appendChild(p);
                    }
                  });
                } else {
                  // Single paragraph - clone structure from original if available
                  const firstPara = contentElements.find(child => child.tagName === "P") as HTMLParagraphElement;
                  const p = firstPara ? firstPara.cloneNode(false) as HTMLParagraphElement : doc.createElement("p");
                  p.innerHTML = slotContent.trim(); // Use innerHTML to support HTML formatting
                  if (heading && heading.nextSibling) {
                    el.insertBefore(p, heading.nextSibling);
                  } else {
                    el.appendChild(p);
                  }
                }
              }
            } else if (el.tagName === "UL" || el.tagName === "OL") {
              // If it's a list element (ul/ol), preserve the element structure
              // Get the first li to clone its structure if available
              const firstLi = el.querySelector("li");
              const items = slotContent
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0);
              if (items.length > 0) {
                // Clear existing items but preserve the ul/ol element structure
                el.innerHTML = "";
                items.forEach(item => {
                  const li = firstLi ? firstLi.cloneNode(false) as HTMLLIElement : doc.createElement("li");
                  li.textContent = item;
                  el.appendChild(li);
                });
              }
            } else if (el.tagName === "P") {
              // For paragraph elements, preserve the element and update content
              // Support HTML formatting (bold, italic, etc.)
              // This preserves classes, IDs, inline styles, and all attributes
              el.innerHTML = slotContent;
            } else if (el.tagName === "DIV" || el.tagName === "SECTION" || el.tagName === "ARTICLE") {
              // For content blocks (DIVs/SECTIONS with multiple paragraphs), replace inner content
              // but preserve the container structure, classes, IDs, and styles
              // Split content by double newlines to create paragraphs
              if (slotContent.trim()) {
                const paragraphs = slotContent.split(/\n\n+/).filter(p => p.trim());
                
                // Clear existing content but preserve the container
                el.innerHTML = "";
                
                // Add each paragraph as a <p> tag
                paragraphs.forEach(para => {
                  const p = doc.createElement("p");
                  p.innerHTML = para.trim(); // Use innerHTML to support HTML formatting
                  el.appendChild(p);
                });
              } else {
                // Empty content - clear the container
                el.innerHTML = "";
              }
            } else {
              // For other elements (span, etc.), preserve the element structure
              // If it has children, try to preserve them; otherwise replace text content
              if (el.children.length > 0) {
                // If element has children, try to preserve structure
                // For now, just update text content of the element itself
                // but keep children structure intact
                const textNodes = Array.from(el.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
                textNodes.forEach(node => node.textContent = "");
                // Add new content as a text node
                if (slotContent.trim()) {
                  el.insertBefore(doc.createTextNode(slotContent), el.firstChild);
                }
              } else {
                // No children, safe to replace text content
                el.textContent = slotContent;
              }
            }
          } else if (slot.type === "image" && el.tagName === "IMG") {
            // For images, set src attribute (preserves all other attributes)
            (el as HTMLImageElement).src = slotContent;
            if (slotContent) {
              (el as HTMLImageElement).alt = slotContent || "Image";
            }
          } else if (slot.type === "url" && el.tagName === "A") {
            // For links, set href attribute (preserves all other attributes)
            (el as HTMLAnchorElement).href = slotContent;
          }
        });
      });

      // Get the updated HTML
      const body = doc.body;
      setRenderedHtml(body.innerHTML);
      setError(null);
    } catch (err) {
      setError("Failed to process template HTML");
      console.error("Template rendering error:", err);
    }
  }, [template.htmlBody, template.slots, slotData]);

  const escapeHtml = (text: string): string => {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  };

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm text-red-800">
          <strong>Preview Error:</strong> {error}
        </p>
      </div>
    );
  }

  return (
    <div 
      className="uploaded-template-wrapper"
      style={{
        width: '100%',
        minHeight: '100vh',
        margin: 0,
        padding: 0,
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            /* Minimal constraints - let template CSS control layout */
            /* Reset wrapper to not interfere with template styles */
            .uploaded-template-wrapper {
              width: 100% !important;
              box-sizing: border-box !important;
              margin: 0 !important;
              padding: 0 !important;
              /* Reset any inherited styles that might interfere */
              font-family: inherit !important;
              font-size: inherit !important;
              line-height: inherit !important;
              color: inherit !important;
            }
            /* Only ensure images are responsive - don't override template styles */
            .uploaded-template-wrapper img {
              max-width: 100% !important;
              height: auto !important;
              /* Don't override other image styles */
            }
            /* Ensure text wraps properly - but don't override template typography */
            .uploaded-template-wrapper * {
              word-wrap: break-word !important;
              overflow-wrap: break-word !important;
              /* Don't override font-family, font-size, color, etc. - let template CSS control */
            }
          `,
        }}
      />
      <div
        dangerouslySetInnerHTML={{ __html: renderedHtml || template.htmlBody }}
      />
    </div>
  );
}
