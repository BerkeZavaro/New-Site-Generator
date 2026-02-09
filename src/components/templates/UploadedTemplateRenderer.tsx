"use client";

import React, { useState } from "react";
import type { TemplateConfig } from "@/lib/templates/types";

interface UploadedTemplateRendererProps {
  template: TemplateConfig;
  slotData: Record<string, string>;
}

export function UploadedTemplateRenderer({ template, slotData }: UploadedTemplateRendererProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');

  // Generate Clean HTML (For WordPress)
  const generateCleanHtml = () => {
    return template.slots
      .filter(slot => slot.type !== 'image' && slot.type !== 'cta')
      .map(slot => {
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
      })
      .filter(Boolean)
      .join('\n\n');
  };

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(generateCleanHtml());
    alert("Clean HTML copied! (Best for manual WordPress pasting)");
  };

  // Generate JSON Data (For Assembler)
  const handleCopyAssemblerData = () => {
    const cleanData: Record<string, string> = {};
    Object.keys(slotData).forEach(key => {
      if (slotData[key]) cleanData[key] = slotData[key];
    });
    navigator.clipboard.writeText(JSON.stringify(cleanData, null, 2));
    alert("Assembler Data copied! Paste this into Part 4 to build the full page.");
  };

  const cleanHtml = generateCleanHtml();

  return (
    <div className="flex flex-col h-full bg-white rounded-md border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 gap-2">
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

        <div className="flex space-x-2">
          <button
            onClick={handleCopyHtml}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            title="Copy simple HTML tags"
          >
            Copy HTML
          </button>
          <button
            onClick={handleCopyAssemblerData}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-purple-600 rounded hover:bg-purple-700 shadow-sm"
            title="Copy data for the Final Assembler tool"
          >
            Copy Data for Assembler
          </button>
        </div>
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
