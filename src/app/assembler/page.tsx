'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { loadUploadedTemplates } from '@/lib/templates/uploadedStorage';
import type { UploadedTemplate } from '@/lib/templates/uploadedTypes';
import { mergeHtml } from '@/lib/assembler/htmlMerger';
import { getSavedFunnels, getFunnelById, type SavedFunnel } from '@/lib/savedFunnelStorage';

export default function AssemblerPage() {
  const [templates, setTemplates] = useState<UploadedTemplate[]>([]);
  const [savedProjects, setSavedProjects] = useState<SavedFunnel[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const [textJson, setTextJson] = useState('');
  const [imageJson, setImageJson] = useState('');

  const [finalHtml, setFinalHtml] = useState('');

  useEffect(() => {
    setTemplates(loadUploadedTemplates());
    setSavedProjects(getSavedFunnels());
  }, []);

  const handleLoadProject = (projectId: string) => {
    if (!projectId) {
      setSelectedProjectId('');
      setSelectedTemplateId('');
      setTextJson('');
      setImageJson('');
      return;
    }
    setSelectedProjectId(projectId);
    const project = getFunnelById(projectId);
    if (project?.data) {
      const data = project.data as { templateId?: string; slotData?: Record<string, string>; imageData?: Record<string, string> };
      if (data.templateId) {
        setSelectedTemplateId(data.templateId);
      }
      setTextJson(data.slotData ? JSON.stringify(data.slotData, null, 2) : '');
      setImageJson(data.imageData ? JSON.stringify(data.imageData, null, 2) : '');
    }
  };

  const handleMerge = () => {
    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
    if (!selectedTemplate) return;

    try {
      const textData = textJson ? JSON.parse(textJson) : {};
      const imageData = imageJson ? JSON.parse(imageJson) : {};

      const result = mergeHtml({
        template: selectedTemplate,
        textData,
        imageData
      });

      setFinalHtml(result);
    } catch (e) {
      alert("Invalid JSON format. Please check your inputs.");
    }
  };

  const handleDownload = () => {
    if (!finalHtml) return;
    const blob = new Blob([finalHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `final-page-${selectedTemplateId}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 px-8 py-4 mb-8">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-gray-900 font-medium">← Dashboard</Link>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="text-xl font-bold text-gray-900">Final Assembler (Part 4)</h1>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-8">

        <div className="space-y-6">

          <div className="bg-green-50 p-6 rounded-lg border border-green-200 shadow-sm">
            <label className="block text-sm font-bold text-green-900 mb-2">
              ⚡ Quick Load Project
            </label>
            <select
              className="w-full border p-2.5 rounded"
              value={selectedProjectId}
              onChange={(e) => handleLoadProject(e.target.value)}
            >
              <option value="">-- Select Saved Project --</option>
              {savedProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <p className="text-xs text-green-700 mt-2">
              Selecting a project will automatically fill the template, text, and image fields below.
            </p>
          </div>

          <hr className="border-gray-200" />

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-4">1. Select Blueprint</h3>
            <select
              className="w-full border p-2.5 rounded"
              value={selectedTemplateId}
              onChange={e => setSelectedTemplateId(e.target.value)}
            >
              <option value="">-- Choose Template --</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between mb-2">
              <h3 className="font-bold text-gray-900">2. Text Data (JSON)</h3>
              <span className="text-xs text-gray-500">Auto-filled from Project</span>
            </div>
            <textarea
              className="w-full border p-3 rounded h-40 font-mono text-xs bg-gray-50"
              placeholder='Paste JSON here... {"headline_1": "..."}'
              value={textJson}
              onChange={e => setTextJson(e.target.value)}
            />
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between mb-2">
              <h3 className="font-bold text-gray-900">3. Image Data (JSON)</h3>
              <span className="text-xs text-gray-500">Auto-filled from Project</span>
            </div>
            <textarea
              className="w-full border p-3 rounded h-40 font-mono text-xs bg-gray-50"
              placeholder='Paste JSON here... {"image_1": "https://..."}'
              value={imageJson}
              onChange={e => setImageJson(e.target.value)}
            />
          </div>

          <button
            type="button"
            onClick={handleMerge}
            disabled={!selectedTemplateId}
            className="w-full py-4 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-300 transition-all"
          >
            MERGE & PREVIEW
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[800px] overflow-hidden">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900">Final Result</h3>
            {finalHtml && (
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
              >
                Download HTML File
              </button>
            )}
          </div>
          <div className="flex-1 bg-gray-100 overflow-auto">
            {finalHtml ? (
              <iframe
                srcDoc={finalHtml}
                className="w-full h-full border-0"
                title="Preview"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                Preview will appear here...
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
