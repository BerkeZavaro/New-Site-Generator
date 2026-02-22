'use client';

import React, { useState, useEffect } from 'react';
import { ImageSlotUpload } from '@/components/templates/ImageSlotUpload';
import type { TemplateConfig } from '@/lib/templates/types';
import { extractImageMetadata } from '@/lib/templates/imageExtractor';

interface ImageStudioProps {
  template: TemplateConfig;
  initialImages?: Record<string, string>;
  onImagesChange: (images: Record<string, string>) => void;
}

export function ImageStudio({ template, initialImages, onImagesChange }: ImageStudioProps) {
  const imageSlots = template.slots.filter(s => s.type === 'image');

  const [imageUrls, setImageUrls] = useState<Record<string, string>>(initialImages || {});

  useEffect(() => {
    if (initialImages) {
      setImageUrls(initialImages);
    }
  }, [initialImages]);

  const handleUrlChange = (slotId: string, url: string) => {
    const newImages = { ...imageUrls, [slotId]: url };
    setImageUrls(newImages);
    onImagesChange(newImages);
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(imageUrls, null, 2));
      alert("Image Data copied!");
    } catch (err) {
      alert("Failed to copy. Please manually copy the data.");
    }
  };

  if (imageSlots.length === 0) {
    return (
      <div className="p-12 text-center bg-white border border-gray-200 rounded-lg">
        <p className="text-gray-500 text-lg">No image slots found in this template.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-purple-50 border border-purple-200 p-6 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-purple-900">
            Export or Save
          </h2>
          <p className="text-sm text-purple-700">
            Your images are automatically synced to the project when you click &quot;Save Project&quot; above.
            You can also copy the raw data here if needed.
          </p>
        </div>
        <button
          type="button"
          onClick={copyJson}
          className="px-6 py-3 bg-purple-100 text-purple-700 font-bold rounded-lg hover:bg-purple-200 transition-all flex items-center gap-2"
        >
          Copy JSON (Manual Backup)
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {imageSlots.map((slot) => {
          const dimensions = {
            width: slot.width || extractImageMetadata(template.htmlBody, slot.id)?.width,
            height: slot.height || extractImageMetadata(template.htmlBody, slot.id)?.height
          };

          const currentUrl = imageUrls[slot.id] || '';

          return (
            <div key={slot.id} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row gap-8">
              <div className="md:w-1/3 space-y-3">
                <h4 className="text-lg font-bold text-gray-900">{slot.label}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">{slot.id}</span>
                </div>

                <div>
                  {dimensions.width && dimensions.height ? (
                    <div className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-green-50 text-green-700 border border-green-100">
                      🎯 Target: {dimensions.width} x {dimensions.height}px
                    </div>
                  ) : (
                    <div className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">
                      ⚠️ Size: Auto-Detect
                    </div>
                  )}
                </div>

                {currentUrl && (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-xs text-orange-600 mb-2 font-medium">
                      ⚠️ AI Links expire! Save this image:
                    </p>
                    <a
                      href={currentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline"
                      download={`image-${slot.id}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Download Image
                    </a>
                  </div>
                )}
              </div>

              <div className="md:flex-1 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <ImageSlotUpload
                  slotId={slot.id}
                  slotLabel={slot.label}
                  value={currentUrl}
                  onChange={(val) => handleUrlChange(slot.id, val)}
                  productName=""
                  mainKeyword=""
                  dimensions={dimensions}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
