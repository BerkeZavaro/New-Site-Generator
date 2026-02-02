"use client";

import React, { useState, useRef } from "react";
import { addUploadedTemplate } from "@/lib/templates/uploadedStorage";
import type { UploadedTemplate } from "@/lib/templates/uploadedTypes";
import { detectSlots } from "@/lib/templates/slotDetector";
import { resolveUrlsInHtml, extractHeadContent } from "@/lib/templates/urlResolver";

interface TemplateUploadPanelProps {
  onUploadSuccess?: () => void;
}

export function TemplateUploadPanel({ onUploadSuccess }: TemplateUploadPanelProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [fetchUrl, setFetchUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

  const processHtmlAndSave = async (
    html: string,
    baseUrl: string | undefined,
    name: string,
    description: string
  ) => {
    let text = html;
    setStatus("Resolving relative URLs...");
    text = resolveUrlsInHtml(text, baseUrl || undefined);
    const headContent = extractHeadContent(text);
    setStatus("Detecting content slots...");
    const { htmlBody, slots: rawSlots } = detectSlots(text);

    // Walk elements and ensure tagName, originalContent, wordCount on every slot
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlBody, "text/html");
    const body = doc.body || doc.documentElement;
    const slotIdToSlot = new Map(rawSlots.map((s) => [s.id, { ...s }]));
    const walkElements = body.querySelectorAll("h1, h2, h3, h4, h5, h6, p, ul, ol, img, a");
    walkElements.forEach((el) => {
      const slotId = el.getAttribute("data-slot");
      if (!slotId || !slotIdToSlot.has(slotId)) return;
      const slot = slotIdToSlot.get(slotId)!;
      const tagName = el.tagName.toLowerCase();
      let originalContent: string;
      if (el.tagName === "IMG") {
        originalContent = el.getAttribute("src")?.trim() || "";
      } else if (el.tagName === "UL" || el.tagName === "OL") {
        const items = el.querySelectorAll("li");
        originalContent =
          items.length > 0
            ? Array.from(items)
                .map((li) => li.textContent?.trim() || "")
                .filter(Boolean)
                .join("\n")
            : el.textContent?.trim() || "";
      } else {
        originalContent = el.textContent?.trim() || "";
      }
      const wc = el.tagName !== "IMG" ? wordCount(originalContent) : undefined;
      slotIdToSlot.set(slotId, {
        ...slot,
        tagName,
        originalContent,
        ...(wc != null ? { wordCount: wc } : {}),
      });
    });
    const templateSlots = Array.from(slotIdToSlot.values());

    if (templateSlots.length === 0) {
      setError("No content slots detected. Ensure the page has headings (h1-h6), paragraphs (p), or lists.");
      setStatus(null);
      return;
    }

    const now = new Date().toISOString();
    const id = `uploaded-${Date.now()}`;
    const uploaded: UploadedTemplate = {
      id: id as any,
      name,
      description,
      htmlBody,
      css: "",
      ...(headContent ? { headContent } : {}),
      slots: templateSlots,
      createdAt: now,
    };

    addUploadedTemplate(uploaded);
    setStatus(`Success! Template "${name}" added with ${templateSlots.length} editable slots.`);
    if (onUploadSuccess) onUploadSuccess();
    setTimeout(() => setStatus(null), 5000);
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = fetchUrl.trim();
    if (!url) return;

    setError(null);
    setStatus("Fetching page...");
    setIsProcessing(true);

    try {
      const res = await fetch(`/api/fetch-html?url=${encodeURIComponent(url)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to fetch: ${res.status}`);
      }
      const { html } = await res.json();
      if (!html || typeof html !== "string") {
        throw new Error("Invalid response from server");
      }

      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        parsed = new URL(url, "https://example.com");
      }
      const baseUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname.replace(/\/?$/, "")}/`;
      const pageName = parsed.pathname?.replace(/^\/|\/$/g, "").split("/").pop() || "Imported Page";

      await processHtmlAndSave(html, baseUrl, pageName || "Imported Template", `Fetched from: ${url}`);
      setFetchUrl("");
    } catch (err: any) {
      setError(err?.message || "Failed to fetch page. Check the URL and try again.");
      setStatus(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setStatus("Reading file...");
    setIsProcessing(true);

    try {
      const text = await readFileAsText(file);
      const name = file.name.replace(/\.[^/.]+$/, "") || "Uploaded Template";
      await processHtmlAndSave(text, sourceUrl.trim() || undefined, name, `Uploaded from file: ${file.name}`);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      console.error(err);
      setError("Failed to process file. Please ensure it is a valid HTML file.");
      setStatus(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper to read file as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Upload Template File</h3>
      <p className="text-sm text-gray-600 mb-4">
        Upload an HTML file or fetch directly from a URL. The system will detect editable content slots and capture original content for AI generation.
      </p>

      <div className="space-y-4">
        <form onSubmit={handleUrlSubmit} className="flex gap-2">
          <input
            type="url"
            placeholder="https://example.com/page"
            value={fetchUrl}
            onChange={(e) => setFetchUrl(e.target.value)}
            disabled={isProcessing}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isProcessing || !fetchUrl.trim()}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Fetch from URL
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-gray-500">or upload file</span>
          </div>
        </div>

        <div>
          <label htmlFor="source-url" className="block text-sm font-medium text-gray-700 mb-1">
            Source URL <span className="text-gray-400 font-normal">(optional, for file uploads)</span>
          </label>
          <input
            id="source-url"
            type="url"
            placeholder="https://example.com/page"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            If the HTML was saved from a website, enter the page URL to fix broken images and styles (relative URLs will be converted to absolute).
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex-1">
            <span className="sr-only">Choose file</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm"
              onChange={handleFileChange}
              disabled={isProcessing}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                cursor-pointer"
            />
          </label>
        </div>

        {status && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
            {status}
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
            {error}
          </div>
        )}
      </div>
      
      <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-500">
        <strong>Tip:</strong> For best results, use &quot;Save Page As &gt; Webpage, Single File&quot; or &quot;Webpage, HTML Only&quot; in your browser.
        If images or styles are broken after upload, enter the Source URL above (the page you saved from) to resolve relative paths.
      </div>
    </div>
  );
}
