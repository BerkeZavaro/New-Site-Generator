/**
 * Image optimization utilities for the site generator.
 * Handles resizing, compression, and format conversion.
 */

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1 for JPEG/WebP
  format?: 'jpeg' | 'webp' | 'png' | 'original';
  maxSizeKB?: number; // Target max file size in KB
}

export interface OptimizedImageResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  size: number; // in bytes
  format: string;
}

/**
 * Optimize an image file according to the specified options.
 */
export async function optimizeImage(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImageResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.85,
    format = 'webp',
    maxSizeKB = 500,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and optimize
        ctx.drawImage(img, 0, 0, width, height);

        // Determine output format
        const outputFormat = format === 'original' 
          ? file.type || 'image/jpeg'
          : format === 'webp' 
            ? 'image/webp'
            : format === 'png'
              ? 'image/png'
              : 'image/jpeg';

        // Convert to blob with quality settings
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }

            // If the blob is still too large, reduce quality further
            if (blob.size > maxSizeKB * 1024 && outputFormat !== 'image/png') {
              // Recursively optimize with lower quality
              const lowerQuality = Math.max(0.5, quality - 0.1);
              optimizeImage(file, { ...options, quality: lowerQuality })
                .then(resolve)
                .catch(reject);
              return;
            }

            const url = URL.createObjectURL(blob);
            resolve({
              blob,
              url,
              width,
              height,
              size: blob.size,
              format: outputFormat,
            });
          },
          outputFormat,
          outputFormat === 'image/png' ? undefined : quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get image dimensions from a file.
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      reject(new Error('Failed to load image'));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Convert a data URL or blob URL to a File object.
 */
export async function urlToFile(url: string, filename: string, mimeType: string): Promise<File> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new File([blob], filename, { type: mimeType });
}

/**
 * Check if an image needs optimization based on size and dimensions.
 */
export async function shouldOptimizeImage(
  file: File,
  maxSizeKB: number = 500,
  maxWidth: number = 1920,
  maxHeight: number = 1920
): Promise<boolean> {
  const sizeKB = file.size / 1024;
  if (sizeKB > maxSizeKB) {
    return true;
  }

  try {
    const { width, height } = await getImageDimensions(file);
    return width > maxWidth || height > maxHeight;
  } catch {
    return false;
  }
}


