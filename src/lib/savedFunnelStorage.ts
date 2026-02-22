'use client';

export interface SavedFunnel {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  data: {
    productName?: string;
    mainKeyword?: string;
    templateId?: string;
    slotData?: Record<string, string>;
    imageData?: Record<string, string>;
    [key: string]: unknown;
  };
}

const STORAGE_KEY = 'funnel_projects';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Normalize input: callers may pass raw wizard data or { data: {...} }. */
function normalizeData(funnelData: unknown): SavedFunnel['data'] {
  if (funnelData == null) return {};
  const obj = funnelData as Record<string, unknown>;
  if (obj.data != null && typeof obj.data === 'object' && !('templateId' in obj)) {
    return obj.data as SavedFunnel['data'];
  }
  return obj as SavedFunnel['data'];
}

function getName(data: SavedFunnel['data']): string {
  if (data.productName && data.mainKeyword) {
    return `${data.productName} (${data.mainKeyword})`;
  }
  return data.productName || 'Untitled Project';
}

export function getSavedFunnels(): SavedFunnel[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Error loading funnels", e);
    return [];
  }
}

export function getFunnelById(id: string): SavedFunnel | undefined {
  return getSavedFunnels().find(f => f.id === id);
}

export function saveFunnel(funnelData: unknown, funnelId?: string): string {
  const funnels = getSavedFunnels();
  const now = Date.now();
  const innerData = normalizeData(funnelData);

  let newId = funnelId || generateId();
  let updatedFunnels: SavedFunnel[];

  if (funnelId) {
    const existing = funnels.find(f => f.id === funnelId);
    if (existing) {
      updatedFunnels = funnels.map(f =>
        f.id === funnelId
          ? {
              ...f,
              name: getName({ ...f.data, ...innerData }),
              updatedAt: now,
              data: { ...f.data, ...innerData }
            }
          : f
      );
    } else {
      const newFunnel: SavedFunnel = {
        id: newId,
        name: getName(innerData),
        createdAt: now,
        updatedAt: now,
        data: { ...innerData }
      };
      updatedFunnels = [newFunnel, ...funnels];
    }
  } else {
    const newFunnel: SavedFunnel = {
      id: newId,
      name: getName(innerData),
      createdAt: now,
      updatedAt: now,
      data: { ...innerData }
    };
    updatedFunnels = [newFunnel, ...funnels];
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFunnels));
    return newId;
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    console.error('Failed to save funnel:', error);
    if (
      err.name === 'QuotaExceededError' ||
      err.message?.toLowerCase().includes('quota') ||
      err.message?.toLowerCase().includes('exceeded')
    ) {
      alert(
        "⚠️ STORAGE FULL! The project is too large to save.\n\nYou may need to delete old projects from 'Saved Work'."
      );
    }
    return newId;
  }
}

export function deleteFunnel(id: string): void {
  const funnels = getSavedFunnels().filter(f => f.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(funnels));
}
