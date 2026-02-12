'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSavedFunnels, deleteFunnel, type SavedFunnel } from '@/lib/savedFunnelStorage';

export default function SavedFunnelsPage() {
  const [funnels, setFunnels] = useState<SavedFunnel[]>([]);

  useEffect(() => {
    setFunnels(getSavedFunnels());
  }, []);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this saved project?')) {
      deleteFunnel(id);
      setFunnels(getSavedFunnels());
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 px-8 py-4 mb-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-500 hover:text-gray-900 font-medium">
              ← Dashboard
            </Link>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-xl font-bold text-gray-900">Saved Work</h1>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-8">
        {funnels.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-400 text-lg mb-4">No saved projects found.</p>
            <Link
              href="/wizard"
              className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
            >
              Start New Project
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {funnels.map((funnel) => (
              <div key={funnel.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col">
                <div className="flex-1 mb-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{funnel.name}</h3>
                  <p className="text-sm text-gray-500">
                    Last updated: {new Date(funnel.updatedAt).toLocaleDateString()}
                  </p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {funnel.data?.productName && (
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200">
                        {funnel.data.productName}
                      </span>
                    )}
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200">
                      {funnel.data?.templateId ? 'Template Selected' : 'No Template'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 mt-auto">
                  <Link
                    href={`/wizard?id=${funnel.id}`}
                    className="flex-1 text-center bg-blue-50 text-blue-700 py-2 rounded font-medium hover:bg-blue-100"
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(funnel.id)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                    title="Delete Project"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
