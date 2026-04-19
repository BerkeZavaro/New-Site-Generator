"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from 'next/link';
import { TEMPLATES } from '@/lib/templates/registry';
import { loadUploadedTemplates, deleteUploadedTemplate } from '@/lib/templates/uploadedStorage';
import type { UploadedTemplate } from '@/lib/templates/uploadedTypes';
import { TemplateUploadPanel } from '@/components/templates/TemplateUploadPanel';
import {
  formatStorageFullBannerMessage,
  getStorageUsageBytes,
  isStorageQuotaExceededError,
  STORAGE_BUDGET_BYTES,
} from '@/lib/storage/quotaGuard';

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export default function TemplatesPage() {
  const [uploaded, setUploaded] = useState<UploadedTemplate[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [usageBytes, setUsageBytes] = useState(0);

  const refreshUsage = useCallback(() => {
    setUsageBytes(getStorageUsageBytes());
  }, []);

  useEffect(() => {
    setUploaded(loadUploadedTemplates());
    refreshUsage();
  }, [refreshUsage]);

  useEffect(() => {
    refreshUsage();
  }, [uploaded, refreshUsage]);

  // Re-load uploaded templates when storage changes
  useEffect(() => {
    const handleTemplateUploaded = () => {
      setUploaded(loadUploadedTemplates());
      refreshUsage();
    };
    window.addEventListener('template-uploaded', handleTemplateUploaded);
    return () => window.removeEventListener('template-uploaded', handleTemplateUploaded);
  }, [refreshUsage]);

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      const updated = deleteUploadedTemplate(id);
      setUploaded(updated);
      refreshUsage();
      setPageError(null);
    } catch (e) {
      console.error('[templates-page] delete template FULL ERROR:', e);
      if (isStorageQuotaExceededError(e)) {
        setPageError(formatStorageFullBannerMessage(e.usageBytes, e.attemptedBytes));
      } else {
        const detail = e instanceof Error ? e.message : String(e);
        setPageError(`Could not delete template: ${detail}`);
      }
    }
  };

  const handleDownloadReadyToEdit = async (template: UploadedTemplate) => {
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template,
          slug: template.name.replace(/[^a-z0-9-_]/gi, '-').toLowerCase().substring(0, 50),
          exportFormat: 'ready-to-edit',
        }),
      });

      if (!res.ok) {
        alert('Failed to generate download. Please try again.');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (template.name.replace(/[^a-z0-9-_]/gi, '-').toLowerCase() || 'template') + '-ready-to-edit.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download. Please try again.');
    }
  };

  const usagePct = (usageBytes / STORAGE_BUDGET_BYTES) * 100;
  const usagePctDisplay = Math.round(usagePct);
  const usageMb = (usageBytes / (1024 * 1024)).toFixed(1);
  const usageColorClass =
    usagePct > 90 ? 'text-red-600' : usagePct > 70 ? 'text-amber-600' : 'text-gray-500';

  return (
    <main className="min-h-screen p-8 sm:p-20 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {pageError ? (
          <div
            role="alert"
            className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-md mb-4 flex items-start justify-between gap-3"
          >
            <span className="flex-1 min-w-0 whitespace-pre-wrap break-words">{pageError}</span>
            <button
              type="button"
              onClick={() => setPageError(null)}
              className="flex-shrink-0 text-sm font-medium text-red-800 hover:text-red-950 underline"
            >
              Dismiss
            </button>
          </div>
        ) : null}
        <div className="mb-8">
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to home
          </Link>
          <h1 className="text-4xl font-bold mb-4 text-gray-900">Templates</h1>
          <p className="text-gray-700 leading-relaxed">
            Templates define the design and content slots for funnel sites. System templates are built-in; uploaded templates
            come from your own HTML files.
          </p>
        </div>

        {/* System Templates */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Templates</h2>
          
          {TEMPLATES.length === 0 ? (
            <p className="text-gray-600">No system templates available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {TEMPLATES.map((template) => (
                    <tr key={template.id} className="border-b border-gray-100">
                      <td className="py-4 px-4 font-medium text-gray-900">{template.name}</td>
                      <td className="py-4 px-4 text-gray-600">{template.description}</td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          System
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {template.id === 'creatine-report' ? (
                          <Link
                            href="/preview"
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            Preview
                          </Link>
                        ) : (
                          <span className="text-gray-400 text-sm">Preview (coming soon)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Uploaded Templates */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Uploaded Templates</h2>
          <p className={`text-xs mb-4 ${usageColorClass}`}>
            Storage: {usageMb} MB / 5.0 MB ({usagePctDisplay}%)
          </p>

          {uploaded.length === 0 ? (
            <p className="text-gray-600 text-sm">No uploaded templates yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Slots</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Uploaded</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uploaded.map((template) => (
                    <tr key={template.id} className="border-b border-gray-100">
                      <td className="py-4 px-4 font-medium text-gray-900">{template.name}</td>
                      <td className="py-4 px-4 text-gray-600 text-sm">{template.description || "No description"}</td>
                      <td className="py-4 px-4 text-gray-600">{template.slots.length}</td>
                      <td className="py-4 px-4 text-gray-600 text-sm">
                        {new Date(template.createdAt).toLocaleString()}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-3 flex-wrap">
                          <Link
                            href={`/templates/preview/${template.id}`}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            Preview
                          </Link>
                          <Link
                            href={`/templates/edit/${template.id}`}
                            className="text-purple-600 hover:text-purple-800 font-medium text-sm"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => {
                              const htmlContent = template.htmlBody;
                              const cssContent = template.css || '';
                              const headContent = (template as { headContent?: string }).headContent || '';
                              const fullContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${template.name}</title>
  ${headContent}
  ${cssContent ? `<style>\n${cssContent}\n  </style>` : ''}
</head>
<body>
${htmlContent}
</body>
</html>`;
                              const blob = new Blob([fullContent], { type: 'text/html' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${template.id}.html`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="text-green-600 hover:text-green-800 font-medium text-sm"
                          >
                            Download
                          </button>
                          <button
                            onClick={() => handleDownloadReadyToEdit(template)}
                            className="text-sm text-emerald-600 hover:text-emerald-800 font-medium"
                            title="Download as ready-to-edit HTML package with markdown content file"
                          >
                            📦 Ready-to-Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(template.id)}
                            className="text-red-600 hover:text-red-900 font-medium text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upload Template Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <TemplateUploadPanel
            onUploadSuccess={() => {
              setUploaded(loadUploadedTemplates());
              refreshUsage();
              setPageError(null);
            }}
            onStorageFailure={(msg) => setPageError(msg)}
          />
        </div>
      </div>
    </main>
  );
}

