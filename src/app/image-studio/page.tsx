'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { loadUploadedTemplates } from '@/lib/templates/uploadedStorage';
import type { UploadedTemplate } from '@/lib/templates/uploadedTypes';
import { ImageStudio } from '@/components/templates/ImageStudio';
import { getSavedFunnels, saveFunnel, getFunnelById, type SavedFunnel } from '@/lib/savedFunnelStorage';

export default function ImageStudioPage() {
  const searchParams = useSearchParams();

  const [templates, setTemplates] = useState<UploadedTemplate[]>([]);
  const [savedProjects, setSavedProjects] = useState<SavedFunnel[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const [currentImageData, setCurrentImageData] = useState<Record<string, string>>({});

  const handleLoadProject = (projectId: string) => {
    const project = getFunnelById(projectId);
    if (project?.data) {
      setSelectedProjectId(projectId);
      setSelectedTemplateId(project.data.templateId || '');
      setCurrentImageData((project.data as { imageData?: Record<string, string> }).imageData || {});
    }
  };

  useEffect(() => {
    setTemplates(loadUploadedTemplates());
    setSavedProjects(getSavedFunnels());

    const id = searchParams.get('id');
    if (id) {
      handleLoadProject(id);
    }
  }, [searchParams]);

  const handleSaveProject = () => {
    if (!selectedProjectId) {
      alert("No project selected to save to.");
      return;
    }

    const project = getFunnelById(selectedProjectId);
    if (project?.data) {
      const updatedData = {
        ...project.data,
        imageData: currentImageData
      };
      saveFunnel(updatedData, selectedProjectId);
      alert("Images saved to project successfully!");
    }
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 px-8 py-4 mb-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-500 hover:text-gray-900 font-medium">
              ← Dashboard
            </Link>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-xl font-bold text-gray-900">Image Studio (Part 3)</h1>
          </div>

          {selectedProjectId && (
            <button
              type="button"
              onClick={handleSaveProject}
              className="px-6 py-2 bg-purple-600 text-white font-bold rounded shadow hover:bg-purple-700 transition-colors"
            >
              Save Images to Project
            </button>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-8">

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                1. Load Saved Project
              </label>
              <select
                className="w-full border p-2.5 rounded-md text-base"
                value={selectedProjectId}
                onChange={(e) => {
                  if (e.target.value) {
                    handleLoadProject(e.target.value);
                  } else {
                    setSelectedProjectId('');
                    setSelectedTemplateId('');
                    setCurrentImageData({});
                  }
                }}
              >
                <option value="">-- Select a Project --</option>
                {savedProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                2. Confirm Template
              </label>
              <select
                className="w-full border p-2.5 rounded-md text-base bg-gray-50"
                value={selectedTemplateId}
                disabled
              >
                <option value="">(Auto-selected from Project)</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {selectedTemplate ? (
          <ImageStudio
            template={selectedTemplate}
            initialImages={currentImageData}
            onImagesChange={setCurrentImageData}
          />
        ) : (
          <div className="text-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-400 text-lg">
              {selectedProjectId
                ? "This project does not have a valid template selected."
                : "Please load a saved project to begin."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
