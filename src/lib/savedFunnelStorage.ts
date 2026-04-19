'use client';

import {
  safeSetItem,
  StorageQuotaExceededError,
  getValueUtf16Bytes,
} from '@/lib/storage/quotaGuard';

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

function persistFunnels(funnels: SavedFunnel[]): void {
  if (typeof window === 'undefined') return;
  const payload = JSON.stringify(funnels);
  const res = safeSetItem(STORAGE_KEY, payload);
  if (!res.ok) {
    if (res.reason === 'quota') {
      console.error('[savedFunnelStorage] Quota exceeded — write aborted', {
        usageBytes: res.usageBytes,
        deltaBytes: res.attemptedBytes,
        payloadUtf16Bytes: getValueUtf16Bytes(payload),
      });
      throw new StorageQuotaExceededError(res.usageBytes, getValueUtf16Bytes(payload));
    }
    console.error('[savedFunnelStorage] localStorage write failed', res.error);
    throw res.error;
  }
}

export function getSavedFunnels(): SavedFunnel[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading funnels:', error);
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

  persistFunnels(updatedFunnels);
  return newId;
}

export function deleteFunnel(id: string): void {
  const funnels = getSavedFunnels().filter(f => f.id !== id);
  persistFunnels(funnels);
}

export function duplicateFunnel(id: string): SavedFunnel | null {
  const funnels = getSavedFunnels();
  const original = funnels.find(f => f.id === id);
  if (!original) return null;

  const now = Date.now();
  const duplicate: SavedFunnel = {
    id: generateId(),
    name: `${original.name} (Copy)`,
    createdAt: now,
    updatedAt: now,
    data: { ...original.data },
  };

  const updated = [duplicate, ...funnels];
  persistFunnels(updated);
  return duplicate;
}
