"use client";

import React, { useState, useRef, useEffect } from "react";
import { optimizeImage, shouldOptimizeImage } from "@/lib/image-optimization";

interface ImageSlotUploadProps {
  slotId: string;
  slotLabel: string;
  value: string;
  onChange: (value: string) => void;
  placeholderImage?: string; // Optional: current placeholder from template
  dimensions?: { width?: number; height?: number }; // Optional: suggested dimensions
  productName?: string; // Optional: product name for AI context
  mainKeyword?: string; // Optional: main keyword for AI context
}

export function ImageSlotUpload({
  slotId,
  slotLabel,
  value,
  onChange,
  placeholderImage,
  dimensions,
  productName,
  mainKeyword,
}: ImageSlotUploadProps) {
  const [uploadMode, setUploadMode] = useState<"url" | "file" | "ai">(value && !value.startsWith("data:") && !value.startsWith("blob:") ? "url" : "file");
  const [preview, setPreview] = useState<string | null>(value || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiError, setAiError] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [autoOptimize, setAutoOptimize] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

  useEffect(() => {
    setPreview(value || null);
    if (value && (value.startsWith('http') || value.startsWith('data:') || value.startsWith('blob:'))) {
      // Try to get image dimensions when value changes
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        setImageDimensions(null);
      };
      img.src = value;
    } else {
      setImageDimensions(null);
    }
  }, [value]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > MAX_FILE_SIZE) {
      alert(`Image size must be less than ${formatFileSize(MAX_FILE_SIZE)}. Your file is ${formatFileSize(file.size)}.`);
      return;
    }

    setFileSize(file.size);
    setIsUploading(true);

    try {
      // Check if optimization is needed
      const needsOptimization = await shouldOptimizeImage(
        file,
        500, // maxSizeKB
        dimensions?.width || 1920,
        dimensions?.height || 1920
      );

      if (needsOptimization && autoOptimize) {
        setIsOptimizing(true);
        try {
          // Optimize the image
          const optimized = await optimizeImage(file, {
            maxWidth: dimensions?.width || 1920,
            maxHeight: dimensions?.height || 1920,
            quality: 0.85,
            format: 'webp',
            maxSizeKB: 500,
          });

          // Convert optimized blob to data URL
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setPreview(dataUrl);
            onChange(dataUrl);
            setFileSize(optimized.size);
            setImageDimensions({ width: optimized.width, height: optimized.height });
            setIsUploading(false);
            setIsOptimizing(false);
          };
          reader.onerror = () => {
            alert("Failed to process optimized image");
            setIsUploading(false);
            setIsOptimizing(false);
            setFileSize(null);
          };
          reader.readAsDataURL(optimized.blob);
          return;
        } catch (optimizeError) {
          // Fall through to regular upload if optimization fails
          setIsOptimizing(false);
        }
      }

      // Regular upload (no optimization or optimization disabled)
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setPreview(dataUrl);
        onChange(dataUrl);
        setIsUploading(false);
        
        // Get image dimensions
        const img = new Image();
        img.onload = () => {
          setImageDimensions({ width: img.width, height: img.height });
        };
        img.src = dataUrl;
      };
      reader.onerror = () => {
        alert("Failed to read image file");
        setIsUploading(false);
        setFileSize(null);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      alert("Failed to upload image");
      setIsUploading(false);
      setFileSize(null);
    }
  };
  
  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleUrlChange = (url: string) => {
    onChange(url);
    if (url.trim()) {
      setPreview(url);
      // Try to get image dimensions from URL
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        setImageDimensions(null);
      };
      img.src = url;
      setFileSize(null); // URL images don't have file size
    } else {
      setPreview(null);
      setImageDimensions(null);
      setFileSize(null);
    }
  };

  const handleRemove = () => {
    onChange("");
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerateImage = async () => {
    if (!aiPrompt.trim()) {
      setAiError("Please enter a description for the image");
      return;
    }

    setIsGenerating(true);
    setAiError(null);

    try {
      // Get context from parent if available (product name, keyword, etc.)
      // For now, we'll use the prompt directly
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          slotLabel: slotLabel,
          dimensions: dimensions,
          productName: productName,
          mainKeyword: mainKeyword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If image generation isn't available, show helpful error
        if (data.alternatives) {
          setAiError(
            `${data.error || 'Image generation failed'}\n\n` +
            `Details: ${data.details || ''}\n\n` +
            `Suggestion: ${data.suggestion || ''}\n\n` +
            `Alternatives:\n${data.alternatives.map((alt: string) => `• ${alt}`).join('\n')}`
          );
        } else {
          setAiError(data.error || data.details || 'Failed to generate image');
        }
        setIsGenerating(false);
        return;
      }

      // If successful, set the generated image
      if (data.success && (data.imageUrl || data.imageData)) {
        const imageUrl = data.imageUrl || data.imageData;
        setPreview(imageUrl);
        onChange(imageUrl);
        setAiError(null); // Clear any previous errors
        
        // Get image dimensions
        const img = new Image();
        img.onload = () => {
          setImageDimensions({ width: img.width, height: img.height });
        };
        img.onerror = () => {
          setImageDimensions(null);
        };
        img.src = imageUrl;
        setFileSize(null); // AI-generated images don't have file size
      } else {
        setAiError(data.error || 'Image generation returned no image data');
      }
    } catch (error: any) {
      setAiError(error.message || 'Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Upload Mode Toggle */}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setUploadMode("file")}
          className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${
            uploadMode === "file"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          📁 Upload File
        </button>
        <button
          type="button"
          onClick={() => setUploadMode("url")}
          className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${
            uploadMode === "url"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          🔗 Use URL
        </button>
        <button
          type="button"
          onClick={() => setUploadMode("ai")}
          className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${
            uploadMode === "ai"
              ? "bg-purple-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          ✨ Generate with AI
        </button>
      </div>

      {/* File Upload Mode */}
      {uploadMode === "file" && (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id={`file-input-${slotId}`}
            disabled={isUploading}
          />
          <label
            htmlFor={`file-input-${slotId}`}
            className={`block w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors text-center ${
              isUploading || isOptimizing
                ? "border-gray-300 bg-gray-50 cursor-not-allowed"
                : preview
                ? "border-green-300 bg-green-50 hover:border-green-400"
                : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
            }`}
          >
            {isOptimizing ? (
              <span className="text-gray-600">Optimizing image...</span>
            ) : isUploading ? (
              <span className="text-gray-600">Uploading...</span>
            ) : preview ? (
              <span className="text-green-700 font-medium">✓ Image uploaded - Click to change</span>
            ) : (
              <span className="text-gray-700">Click to upload image or drag and drop</span>
            )}
          </label>
          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-1 text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={autoOptimize}
                onChange={(e) => setAutoOptimize(e.target.checked)}
                className="rounded"
              />
              <span>Auto-optimize (resize & compress)</span>
            </label>
          </div>
          <div className="flex items-center justify-between text-xs">
            {dimensions && (
              <p className="text-gray-600 font-medium">
                📐 Recommended: <span className="font-semibold">{dimensions.width || "?"} × {dimensions.height || "?"}px</span>
              </p>
            )}
            <p className="text-gray-500">
              Max size: <span className="font-semibold">{formatFileSize(MAX_FILE_SIZE)}</span>
            </p>
          </div>
          {fileSize && (
            <p className={`text-xs ${fileSize > MAX_FILE_SIZE * 0.9 ? 'text-orange-600' : 'text-gray-500'}`}>
              Current file: {formatFileSize(fileSize)}
            </p>
          )}
          {imageDimensions && (
            <p className="text-xs text-gray-500">
              Image dimensions: <span className="font-medium">{imageDimensions.width} × {imageDimensions.height}px</span>
              {dimensions && dimensions.width && dimensions.height && (
                <span className={`ml-2 ${
                  Math.abs(imageDimensions.width - dimensions.width) > dimensions.width * 0.1 ||
                  Math.abs(imageDimensions.height - dimensions.height) > dimensions.height * 0.1
                    ? 'text-orange-600' : 'text-green-600'
                }`}>
                  ({Math.abs(imageDimensions.width - (dimensions.width || 0)) > (dimensions.width || 0) * 0.1 ||
                    Math.abs(imageDimensions.height - (dimensions.height || 0)) > (dimensions.height || 0) * 0.1
                    ? '⚠ Size mismatch' : '✓ Size matches'})
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {/* URL Mode */}
      {uploadMode === "url" && (
        <div className="space-y-2">
          <input
            type="url"
            value={value && !value.startsWith("data:") && !value.startsWith("blob:") ? value : ""}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="flex items-center justify-between text-xs">
            {dimensions && (
              <p className="text-gray-600 font-medium">
                📐 Recommended: <span className="font-semibold">{dimensions.width || "?"} × {dimensions.height || "?"}px</span>
              </p>
            )}
            <p className="text-gray-500">
              Enter a direct URL to an image file
            </p>
          </div>
          {imageDimensions && (
            <p className="text-xs text-gray-500">
              Image dimensions: <span className="font-medium">{imageDimensions.width} × {imageDimensions.height}px</span>
              {dimensions && dimensions.width && dimensions.height && (
                <span className={`ml-2 ${
                  Math.abs(imageDimensions.width - dimensions.width) > dimensions.width * 0.1 ||
                  Math.abs(imageDimensions.height - dimensions.height) > dimensions.height * 0.1
                    ? 'text-orange-600' : 'text-green-600'
                }`}>
                  ({Math.abs(imageDimensions.width - (dimensions.width || 0)) > (dimensions.width || 0) * 0.1 ||
                    Math.abs(imageDimensions.height - (dimensions.height || 0)) > (dimensions.height || 0) * 0.1
                    ? '⚠ Size mismatch' : '✓ Size matches'})
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {/* AI Generation Mode */}
      {uploadMode === "ai" && (
        <div className="space-y-3">
          <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
            <p className="text-sm text-purple-800 mb-2">
              <strong>✨ AI Image Generation</strong>
            </p>
            <p className="text-xs text-purple-700 mb-2">
              Describe the image you want to generate. The AI will create an image based on your product and keyword context.
            </p>
            {dimensions && (
              <p className="text-xs text-purple-700 font-medium">
                📐 Target size: <span className="font-semibold">{dimensions.width || "?"} × {dimensions.height || "?"}px</span>
              </p>
            )}
          </div>
          
          <textarea
            value={aiPrompt}
            onChange={(e) => {
              setAiPrompt(e.target.value);
              setAiError(null);
            }}
            placeholder="e.g., A professional photo of creatine supplement bottle on a clean white background with gym equipment in the background"
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            rows={4}
            disabled={isGenerating}
          />
          
          {aiError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800 whitespace-pre-line">{aiError}</p>
            </div>
          )}
          
          <button
            type="button"
            onClick={handleGenerateImage}
            disabled={isGenerating || !aiPrompt.trim()}
            className={`w-full px-4 py-3 rounded-md font-medium transition-colors ${
              isGenerating || !aiPrompt.trim()
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-purple-600 text-white hover:bg-purple-700"
            }`}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Generating image...
              </span>
            ) : (
              "✨ Generate Image"
            )}
          </button>
          
          <p className="text-xs text-gray-500">
            Note: AI image generation may require additional API setup (Vertex AI Imagen, DALL-E, or Stability AI)
          </p>
        </div>
      )}

      {/* Preview Section */}
      {(preview || placeholderImage) && (
        <div className="space-y-2">
          <div className="relative border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
            <div className="p-2 bg-gray-100 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">Preview: {slotLabel}</span>
              {imageDimensions && (
                <span className="text-xs text-gray-600">
                  {imageDimensions.width} × {imageDimensions.height}px
                </span>
              )}
            </div>
            <div className="p-4 flex items-center justify-center min-h-[200px] max-h-[400px] overflow-auto">
              {preview ? (
                <img
                  src={preview}
                  alt={`Preview for ${slotLabel}`}
                  className="max-w-full max-h-[350px] object-contain rounded"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                  }}
                  onError={() => {
                    setPreview(null);
                    setImageDimensions(null);
                    if (uploadMode === "url") {
                      alert("Failed to load image from URL. Please check the URL and try again.");
                    }
                  }}
                />
              ) : placeholderImage ? (
                <div className="text-center space-y-2">
                  <img
                    src={placeholderImage}
                    alt="Template placeholder"
                    className="max-w-full max-h-[350px] object-contain rounded opacity-50 mx-auto"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                    }}
                  />
                  <p className="text-xs text-gray-500">Template placeholder (replace with your image)</p>
                </div>
              ) : null}
            </div>
          </div>
          {preview && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                {dimensions ? (
                  <span>
                    📐 Recommended: <span className="font-semibold">{dimensions.width || "?"} × {dimensions.height || "?"}px</span>
                  </span>
                ) : (
                  <span className="text-gray-500">No recommended size specified</span>
                )}
                {fileSize && (
                  <span>
                    File size: <span className="font-semibold">{formatFileSize(fileSize)}</span> / {formatFileSize(MAX_FILE_SIZE)} max
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleRemove}
                className="w-full px-4 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
              >
                Remove Image
              </button>
            </div>
          )}
        </div>
      )}

      {/* Info about where this image appears */}
      <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-md p-2">
        💡 <strong>Tip:</strong> This image will appear in the <strong>{slotLabel}</strong> section of your template. 
        {dimensions && dimensions.width && dimensions.height ? (
          <> Use an image sized <strong>{dimensions.width} × {dimensions.height}px</strong> for best results.</>
        ) : (
          <> Use the preview button above to see exactly where it will be placed.</>
        )}
      </div>
    </div>
  );
}

