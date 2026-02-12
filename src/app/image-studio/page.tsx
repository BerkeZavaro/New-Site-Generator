'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { loadUploadedTemplates } from '@/lib/templates/uploadedStorage';
import type { UploadedTemplate } from '@/lib/templates/uploadedTypes';
import { ImageStudio } from '@/components/templates/ImageStudio';

export default function ImageStudioPage() {
  const [templates, setTemplates] = useState<UploadedTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  useEffect(() => {
    setTemplates(loadUploadedTemplates());
  }, []);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Image Studio (Part 3)</h1>
            <p className="text-gray-500">Generate or upload images matching your template&apos;s exact dimensions.</p>
          </div>
          <Link href="/" className="text-blue-600 hover:underline">
            ← Back Home
          </Link>
        </div>

        {/* TEMPLATE SELECTOR */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Template
          </label>
          <select
            className="w-full border p-3 rounded-md text-lg"
            value={selectedTemplateId}
            onChange={e => setSelectedTemplateId(e.target.value)}
          >
            <option value="">-- Choose a Template --</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* IMAGE STUDIO COMPONENT */}
        {selectedTemplate ? (
          <ImageStudio template={selectedTemplate} />
        ) : (
          <div className="text-center py-20 bg-white rounded-lg border border-gray-200 border-dashed">
            <p className="text-gray-400 text-lg">Select a template above to load its image slots.</p>
          </div>
        )}
      </div>
    </div>
  );
}
