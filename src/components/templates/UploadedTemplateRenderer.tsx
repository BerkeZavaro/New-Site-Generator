"use client";

import React, { useState } from "react";
import type { TemplateConfig } from "@/lib/templates/types";

interface UploadedTemplateRendererProps {
  template: TemplateConfig;
  slotData: Record<string, string>;
}

export function UploadedTemplateRenderer({ template, slotData }: UploadedTemplateRendererProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');

  // Generate the Clean HTML Block WITH ATTRIBUTES
  const generateCleanHtml = () => {
    return template.slots.map(slot => {
      const content = slotData[slot.id] || slot.originalContent || '';
      if (!content.trim()) return '';

      const tag = slot.tagName || 'p';
      const attrs = slot.attributes ? ` ${slot.attributes}` : '';

      if (tag === 'ul' || tag === 'ol') {
        const items = content.split('\n').filter(line => line.trim());
        const listItems = items.map(item => `  <li>${item.replace(/^[•*-]\s*/, '')}</li>`).join('\n');
        return `<${tag}${attrs}>\n${listItems}\n</${tag}>`;
      }

      return `<${tag}${attrs}>${content}</${tag}>`;
    }).filter(Boolean).join('\n\n');
  };

  const cleanHtml = generateCleanHtml();

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanHtml);
    alert("HTML copied to clipboard!");
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-md border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1 text-sm font-medium rounded ${activeTab === 'preview' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Visual Preview
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1 text-sm font-medium rounded ${activeTab === 'code' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Raw HTML Code
          </button>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
          Copy HTML
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'preview' ? (
          <div className="prose max-w-none">
            <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
          </div>
        ) : (
          <pre className="p-4 bg-gray-900 text-gray-100 rounded-md text-sm font-mono whitespace-pre-wrap">
            {cleanHtml}
          </pre>
        )}
      </div>
    </div>
  );
}
