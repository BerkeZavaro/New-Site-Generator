"use client";

import React, { useState } from "react";
import type { TemplateConfig } from "@/lib/templates/types";

interface UploadedTemplateRendererProps {
  template: TemplateConfig;
  slotData: Record<string, string>;
}

export function UploadedTemplateRenderer({ template, slotData }: UploadedTemplateRendererProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'json'>('preview');

  // Generate Clean HTML (For WordPress)
  const generateCleanHtml = () => {
    return template.slots
      .filter(slot => slot.type !== 'image' && slot.type !== 'cta')
      .map(slot => {
        const content = slotData[slot.id] || slot.originalContent || '';
        if (!content.trim()) return '';

        const tag = slot.tagName || 'p';
        const attrs = slot.attributes ? ` ${slot.attributes}` : '';

        // LIST HANDLING WITH STYLE PRESERVATION
        if (tag === 'ul' || tag === 'ol') {
          const items = content.split('\n').filter(line => line.trim());
          
          const listItems = items.map(item => {
            const cleanItemText = item.replace(/^[•*-]\s*/, '');
            
            // If we captured a style pattern (e.g. checkmarks), use it
            if (slot.listTemplate) {
              // Replace placeholder with new text
              // Only do safe replacement if {{CONTENT}} exists, otherwise fallback
              if (slot.listTemplate.includes('{{CONTENT}}')) {
                 const styledContent = slot.listTemplate.replace('{{CONTENT}}', cleanItemText);
                 return `  <li>${styledContent}</li>`;
              }
            }
            // Fallback to plain list item
            return `  <li>${cleanItemText}</li>`;
          }).join('\n');

          return `<${tag}${attrs}>\n${listItems}\n</${tag}>`;
        }

        return `<${tag}${attrs}>${content}</${tag}>`;
      })
      .filter(Boolean)
      .join('\n\n');
  };

  // Generate JSON Data (For Assembler)
  const generateJsonData = () => {
    const cleanData: Record<string, string> = {};
    Object.keys(slotData).forEach(key => {
      if (slotData[key]) cleanData[key] = slotData[key];
    });
    return JSON.stringify(cleanData, null, 2);
  };

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(generateCleanHtml());
      alert("HTML copied to clipboard!");
    } catch (err) {
      alert("Failed to copy. Please manually select and copy the code.");
    }
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(generateJsonData());
      alert("JSON Data copied! Ready for the Assembler.");
    } catch (err) {
       alert("Failed to copy. Please manually select and copy the JSON.");
    }
  };

  const cleanHtml = generateCleanHtml();
  const jsonData = generateJsonData();

  return (
    <div className="flex flex-col h-full bg-white rounded-md border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 gap-2">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1 text-sm font-medium rounded transition-colors ${activeTab === 'preview' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Visual Preview
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1 text-sm font-medium rounded transition-colors ${activeTab === 'code' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Raw HTML
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`px-3 py-1 text-sm font-medium rounded transition-colors ${activeTab === 'json' ? 'bg-white shadow text-purple-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Assembler JSON
          </button>
        </div>
        
        <div className="flex space-x-2">
            {activeTab === 'json' ? (
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-purple-600 rounded hover:bg-purple-700 shadow-sm"
              >
                Copy JSON
              </button>
            ) : (
              <button
                onClick={handleCopyHtml}
                className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                Copy HTML
              </button>
            )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-0">
        {activeTab === 'preview' && (
          <div className="p-6 prose max-w-none">
            <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
          </div>
        )}
        
        {activeTab === 'code' && (
          <pre className="p-4 bg-gray-900 text-gray-100 text-sm font-mono whitespace-pre-wrap h-full overflow-auto">
            {cleanHtml}
          </pre>
        )}

        {activeTab === 'json' && (
          <pre className="p-4 bg-slate-800 text-green-400 text-sm font-mono whitespace-pre-wrap h-full overflow-auto border-t border-gray-700">
            {jsonData}
          </pre>
        )}
      </div>
    </div>
  );
}
