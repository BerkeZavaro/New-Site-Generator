'use client';

import React, { useState } from 'react';
import { ImageSlotUpload } from '@/components/templates/ImageSlotUpload';
import type { TemplateConfig } from '@/lib/templates/types';
import { extractImageMetadata } from '@/lib/templates/imageExtractor';

interface ImageStudioProps {
  template: TemplateConfig;
}

export function ImageStudio({ template }: ImageStudioProps) {
  // Filter for ONLY image slots
  const imageSlots = template.slots.filter(s => s.type === 'image');

  // Local state to hold the "Generated/Uploaded" URLs
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  const handleUrlChange = (slotId: string, url: string) => {
    setImageUrls(prev => ({ ...prev, [slotId]: url }));
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(imageUrls, null, 2));
      alert("Image Data copied! \n\nNext Step: Go to the 'Final Assembler' and paste this into Box #3.");
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
      {/* HEADER ACTIONS */}
      <div className="bg-purple-50 border border-purple-200 p-6 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-purple-900">
            Step 2: Export for Assembler
          </h2>
          <p className="text-sm text-purple-700">
            Once you have generated/selected all your images, click this button to get the code for the Final Assembler.
          </p>
        </div>
        <button
          type="button"
          onClick={copyJson}
          className="px-6 py-3 bg-purple-600 text-white font-bold rounded-lg shadow-md hover:bg-purple-700 transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
          Copy Image Data
        </button>
      </div>

      {/* SLOTS GRID */}
      <div className="grid grid-cols-1 gap-8">
        {imageSlots.map((slot) => {
          // 1. Get dimensions
          const dimensions = {
            width: slot.width || extractImageMetadata(template.htmlBody, slot.id)?.width,
            height: slot.height || extractImageMetadata(template.htmlBody, slot.id)?.height
          };

          const currentUrl = imageUrls[slot.id];

          return (
            <div key={slot.id} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row gap-8">
              {/* Left: Specs */}
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

                <p className="text-sm text-gray-500">
                  Use the tools on the right to fill this slot.
                </p>

                {/* DOWNLOAD BUTTON */}
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

              {/* Right: Input */}
              <div className="md:flex-1 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="mb-4">
                  <ImageSlotUpload
                    slotId={slot.id}
                    slotLabel={slot.label}
                    value={currentUrl || ''}
                    onChange={(val) => handleUrlChange(slot.id, val)}
                    productName=""
                    mainKeyword=""
                    dimensions={dimensions}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
