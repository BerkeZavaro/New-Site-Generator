"use client";

import React, { useEffect, useState, useRef } from "react";
import type { UploadedTemplate } from "@/lib/templates/uploadedTypes";

interface UploadedTemplatePreviewProps {
  template: UploadedTemplate;
}

export function UploadedTemplatePreview({ template }: UploadedTemplatePreviewProps) {
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(800);

  // Build a complete HTML document for the iframe
  const buildPreviewHtml = (): string => {
    const headContent = template.headContent || '';
    const css = template.css || '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${headContent}
  ${css ? `<style>${css}</style>` : ''}
  <style>
    /* Prevent horizontal scroll in preview */
    body { overflow-x: hidden; margin: 0; }
  </style>
</head>
<body>
  ${template.htmlBody}
</body>
</html>`;
  };

  // Validate HTML
  useEffect(() => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(template.htmlBody, "text/html");
      const parseError = doc.querySelector("parsererror");
      if (parseError) {
        setError("HTML structure appears to be invalid or incomplete");
      } else {
        setError(null);
      }
    } catch (err) {
      setError("Failed to parse HTML content");
    }
  }, [template.htmlBody]);

  // Auto-resize iframe to content height
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc?.body) {
          const height = Math.max(doc.body.scrollHeight, doc.documentElement?.scrollHeight || 0);
          if (height > 100) {
            setIframeHeight(height + 50);
          }
        }
      } catch (e) {
        // Cross-origin or access error — keep default height
      }
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [template.htmlBody]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-6 border-b border-gray-200 bg-gray-50">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Template Preview: {template.name}
        </h2>
        <p className="text-sm text-gray-600 mb-2">{template.description}</p>
        <div className="flex gap-4 text-xs text-gray-500 mb-2">
          <span>Slots: {template.slots.length}</span>
          <span>Uploaded: {new Date(template.createdAt).toLocaleString()}</span>
          {template.headContent && (
            <span className="text-green-600">✓ Styles loaded</span>
          )}
        </div>
        {template.slots.length === 0 && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>No editable slots detected.</strong> To make sections editable, add <code className="px-1 py-0.5 bg-yellow-100 rounded">{'data-slot="section-name"'}</code> attributes to elements in the HTML.
            </p>
          </div>
        )}
        {!template.headContent && !template.css && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>No styles detected.</strong> The preview may look unstyled. Try re-uploading the template —
              if it was saved from a website, the system will auto-fetch styles from the original page.
            </p>
          </div>
        )}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              <strong>Preview Error:</strong> {error}
            </p>
          </div>
        )}
      </div>
      {!error && (
        <iframe
          ref={iframeRef}
          srcDoc={buildPreviewHtml()}
          className="w-full border-0"
          style={{ height: `${iframeHeight}px`, minHeight: '600px' }}
          sandbox="allow-same-origin"
          title={`Preview: ${template.name}`}
        />
      )}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">HTML Content (Raw)</h3>
            <pre className="bg-white p-4 rounded border border-gray-300 text-xs overflow-x-auto max-h-96 overflow-y-auto">
              <code>{template.htmlBody.substring(0, 2000)}{template.htmlBody.length > 2000 ? '...' : ''}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
