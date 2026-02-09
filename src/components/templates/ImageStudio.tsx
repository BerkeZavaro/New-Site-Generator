'use client';

import React from 'react';
import { ImageSlotUpload } from '@/components/templates/ImageSlotUpload';
import type { TemplateConfig } from '@/lib/templates/types';
import { extractImageMetadata } from '@/lib/templates/imageExtractor';

interface ImageStudioProps {
  template: TemplateConfig;
  slotData: Record<string, string>;
  onUpdateSlot: (slotId: string, value: string) => void;
  productName: string;
  mainKeyword: string;
}

export function ImageStudio({
  template,
  slotData,
  onUpdateSlot,
  productName,
  mainKeyword,
}: ImageStudioProps) {
  // Filter for ONLY image slots
  const imageSlots = template.slots.filter(s => s.type === 'image');

  if (imageSlots.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-500">
          No image slots detected in this template.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {imageSlots.map((slot) => {
        const slotValue = slotData[slot.id] || '';

        // Get dimensions from Part 1 analysis
        const dimensions = {
          width: slot.width || extractImageMetadata(template.htmlBody, slot.id)?.width,
          height: slot.height || extractImageMetadata(template.htmlBody, slot.id)?.height,
        };

        return (
          <div key={slot.id} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-medium text-gray-900">{slot.label}</h4>
                <p className="text-xs text-gray-500 font-mono mt-1">ID: {slot.id}</p>
              </div>
              <div className="text-right">
                {dimensions.width && dimensions.height ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Target: {dimensions.width} x {dimensions.height}px
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Auto-Detect Size
                  </span>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <ImageSlotUpload
                slotId={slot.id}
                slotLabel={slot.label}
                value={slotValue}
                onChange={(val) => onUpdateSlot(slot.id, val)}
                productName={productName}
                mainKeyword={mainKeyword}
                dimensions={dimensions}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
