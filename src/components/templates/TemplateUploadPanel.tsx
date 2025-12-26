"use client";

import React, { useState } from "react";
import { addUploadedTemplate } from "@/lib/templates/uploadedStorage";
import type { UploadedTemplate, TemplateSlot } from "@/lib/templates/uploadedTypes";

interface TemplateUploadPanelProps {
  onUploadSuccess?: () => void;
}

export function TemplateUploadPanel({ onUploadSuccess }: TemplateUploadPanelProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [isFetching, setIsFetching] = useState(false);

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) {
      setError("Please enter a website URL");
      return;
    }

    setStatus("Fetching website...");
    setError(null);
    setIsFetching(true);

    try {
      const response = await fetch("/api/fetch-template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch website");
      }

      const data = await response.json();
      const { htmlBody, css } = data;

      if (!htmlBody) {
        throw new Error("No body content found in the website");
      }

      // Parse HTML to automatically detect and mark all text content as editable
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlBody, "text/html");
      const body = doc.body;

      const getTextPreview = (text: string, maxLen: number = 40): string => {
        const trimmed = text.trim();
        if (trimmed.length === 0) return "";
        return trimmed.length > maxLen ? trimmed.substring(0, maxLen) + "..." : trimmed;
      };

      // Find all content elements in document order (headings, paragraphs, lists, images)
      // Process them individually to preserve exact structure
      const processedElements = new Set<Element>();
      const slots: { element: Element; label: string; index: number; type: TemplateSlot["type"] }[] = [];
      
      // Counters for descriptive labeling - track each heading level separately
      let h1Count = 0;
      let h2Count = 0;
      let h3Count = 0;
      let h4Count = 0;
      let h5Count = 0;
      let h6Count = 0;
      let paragraphCount = 0;
      let listCount = 0;
      let imageCount = 0;
      let slotIndex = 0;

      // Walk through all elements in document order
      const walkElements = (parent: Element) => {
        const children = Array.from(parent.children);
        
        for (const el of children) {
          if (processedElements.has(el)) continue;
          
          const tag = el.tagName.toUpperCase();
          const text = el.textContent?.trim() || "";
          
          // Skip empty elements and non-content elements
          if (text.length === 0 && tag !== "IMG") {
            // Recursively process children
            walkElements(el);
            continue;
          }
          
          // First, check if this is a content-rich container (like product review cards)
          // that should be treated as a single editable block
          if (tag === "DIV" || tag === "SECTION" || tag === "ARTICLE") {
            const hasHeadings = el.querySelector("h1, h2, h3, h4, h5, h6");
            const paragraphs = el.querySelectorAll("p");
            const hasMultipleParagraphs = paragraphs.length >= 2;
            const hasLists = el.querySelector("ul, ol");
            const hasImages = el.querySelector("img");
            
            // Check if this looks like a content block (product review, card, etc.)
            // Criteria: Has heading + multiple paragraphs, OR multiple paragraphs + images, OR substantial content
            const isContentBlock = 
              (hasHeadings && hasMultipleParagraphs) || 
              (hasMultipleParagraphs && hasImages) ||
              (paragraphs.length >= 3) ||
              (text.length >= 200 && (hasHeadings || hasMultipleParagraphs));
            
            if (isContentBlock) {
              // This is a content block - make it a single editable slot
              paragraphCount++;
              const headingText = hasHeadings 
                ? getTextPreview(hasHeadings.textContent || "", 30)
                : "";
              const label = headingText 
                ? `Content Block ${paragraphCount}: ${headingText}`
                : `Content Block ${paragraphCount}`;
              
              slots.push({
                element: el,
                label: label,
                index: slotIndex++,
                type: "text"
              });
              processedElements.add(el);
              // Mark all children as processed so they don't get extracted separately
              el.querySelectorAll("*").forEach(child => processedElements.add(child));
              continue;
            }
          }
          
          // Process headings individually
          // PRESERVE ORIGINAL TAG: If original has <h1>, keep it as <h1>. If <h2>, keep as <h2>, etc.
          // Label clearly shows the tag type so user knows exactly which section they're editing
          if (tag.match(/^H[1-6]$/)) {
            const level = parseInt(tag[1]);
            let label = "";
            
            if (level === 1) {
              h1Count++;
              label = `H1 Heading ${h1Count}`;
            } else if (level === 2) {
              h2Count++;
              label = `H2 Subheading ${h2Count}`;
            } else if (level === 3) {
              h3Count++;
              label = `H3 Section Header ${h3Count}`;
            } else if (level === 4) {
              h4Count++;
              label = `H4 Subsection ${h4Count}`;
            } else if (level === 5) {
              h5Count++;
              label = `H5 Minor Header ${h5Count}`;
            } else {
              h6Count++;
              label = `H6 Minor Header ${h6Count}`;
            }
            
            // Store the original element - its tag (H1, H2, H3, etc.) will be preserved exactly
            slots.push({
              element: el,
              label: label,
              index: slotIndex++,
              type: "text"
            });
            processedElements.add(el);
          }
          // Process paragraphs individually
          // PRESERVE ORIGINAL TAG: If original has <p>, keep it as <p>
          else if (tag === "P" && text.length >= 10) {
            paragraphCount++;
            const label = `Paragraph ${paragraphCount}`;
            
            // Store the original element - its tag (P) will be preserved exactly
            slots.push({
              element: el,
              label: label,
              index: slotIndex++,
              type: "text"
            });
            processedElements.add(el);
          }
          // Process lists individually
          else if (tag === "UL" || tag === "OL") {
            listCount++;
            const label = `List ${listCount}`;
            
            slots.push({
              element: el,
              label: label,
              index: slotIndex++,
              type: "list"
            });
            processedElements.add(el);
          }
          // Process images individually
          else if (tag === "IMG") {
            imageCount++;
            const label = `Image ${imageCount}`;
            
            slots.push({
              element: el,
              label: label,
              index: slotIndex++,
              type: "image"
            });
            processedElements.add(el);
          }
          // For DIV, SECTION, ARTICLE - check if it's a content-rich container
          else if (tag === "DIV" || tag === "SECTION" || tag === "ARTICLE") {
            // Check if this container has substantial content (multiple paragraphs, headings, etc.)
            const hasHeadings = el.querySelector("h1, h2, h3, h4, h5, h6");
            const paragraphs = el.querySelectorAll("p");
            const hasMultipleParagraphs = paragraphs.length >= 2;
            const hasLists = el.querySelector("ul, ol");
            const directText = Array.from(el.childNodes)
              .filter(node => node.nodeType === Node.TEXT_NODE)
              .map(node => node.textContent?.trim())
              .join(" ")
              .trim();
            
            // If it has substantial content (headings + paragraphs, or multiple paragraphs, or significant direct text)
            // Make it a content block slot
            if ((hasHeadings && hasMultipleParagraphs) || 
                (hasMultipleParagraphs && paragraphs.length >= 3) ||
                (directText.length >= 100 && !hasHeadings && paragraphs.length === 0)) {
              
              // This is a content block (like a product review card)
              paragraphCount++; // Reuse paragraph counter for content blocks
              const label = hasHeadings 
                ? `Content Block ${paragraphCount} (with heading)`
                : `Content Block ${paragraphCount}`;
              
              slots.push({
                element: el,
                label: label,
                index: slotIndex++,
                type: "text"
              });
              processedElements.add(el);
            } else {
              // Not substantial enough, recursively process children
              walkElements(el);
            }
          }
        }
      };
      
      // Start walking from body
      walkElements(body);

      // Add data-slot attributes and create template slots
      // IMPORTANT: We only add data-slot attributes - we do NOT change the original HTML tags
      // If original has <h1>, it stays <h1>. If original has <h2>, it stays <h2>. If original has <p>, it stays <p>.
      // The structure and tag types are preserved exactly as they appear in the source.
      const templateSlots: TemplateSlot[] = [];
      slots.forEach((slot) => {
        const slotId = `slot_${slot.index}`;
        
        // Add data-slot attribute to the element WITHOUT changing its tag or structure
        // Original tag (H1, H2, H3, P, UL, etc.) is preserved exactly
        slot.element.setAttribute("data-slot", slotId);

        templateSlots.push({
          id: slotId,
          type: slot.type,
          label: slot.label
        });
      });

      // Get the HTML with data-slot attributes added, but original tags preserved
      // H1 stays H1, H2 stays H2, P stays P - exact format of original source template
      const updatedHtmlBody = body.innerHTML;

      const now = new Date().toISOString();
      const urlObj = new URL(url.trim());
      const baseName = urlObj.hostname.replace(/^www\./, "") || "website-template";
      const id = (`uploaded-${baseName}`).toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const name = baseName.charAt(0).toUpperCase() + baseName.slice(1);

      const uploaded: UploadedTemplate = {
        id: id as any,
        name,
        description: `Template extracted from ${url.trim()}`,
        htmlBody: updatedHtmlBody,
        css: css || undefined,
        slots: templateSlots,
        createdAt: now,
      };

      addUploadedTemplate(uploaded);
      setStatus(`Template "${name}" created with ${templateSlots.length} slot(s).`);
      setUrl(""); // Clear input
      if (onUploadSuccess) {
        onUploadSuccess();
      }
      window.dispatchEvent(new CustomEvent("template-uploaded"));
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to fetch and process website.");
      setStatus(null);
    } finally {
      setIsFetching(false);
    }
  }

  return (
    <div style={{ borderTop: "1px solid #ddd", marginTop: "16px", paddingTop: "12px" }}>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Create Template from Website</h3>
      <p className="text-sm text-gray-600 mb-4">
        Enter a website URL to extract its HTML and CSS. The system will automatically remove scripts, ads, and tracking code, keeping only the design structure.
      </p>
      <form onSubmit={handleUrlSubmit} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isFetching}
          />
          <button
            type="submit"
            disabled={isFetching || !url.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {isFetching ? "Fetching..." : "Extract Template"}
          </button>
        </div>
        {status && (
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
            {status}
          </div>
        )}
        {error && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
            {error}
          </div>
        )}
      </form>
      <p className="mt-3 text-xs text-gray-500">
        Note: The website must be publicly accessible. The system will automatically detect all headings, paragraphs, and lists and make them editable - no technical knowledge required!
      </p>
    </div>
  );
}
