'use client';

export interface SavedFunnel {
  id: string;
  name: string; // e.g. "Creatine - Muscle Boost"
  updatedAt: string;
  data: any; // Stores the full WizardData (slots, narrative, config)
}

const STORAGE_KEY = 'funnel_factory_projects';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function getSavedFunnels(): SavedFunnel[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load funnels", e);
    return [];
  }
}

export function saveFunnel(funnelData: any, existingId?: string): string {
  const funnels = getSavedFunnels();
  const now = new Date().toISOString();

  let funnelId = existingId;
  let newFunnels = [...funnels];

  if (funnelId) {
    // Update existing
    const index = newFunnels.findIndex(f => f.id === funnelId);
    if (index >= 0) {
      newFunnels[index] = {
        ...newFunnels[index],
        name: `${funnelData.productName} (${funnelData.mainKeyword})`,
        updatedAt: now,
        data: funnelData
      };
    } else {
      // ID provided but not found? Treat as new.
      funnelId = generateId();
      newFunnels.push({
        id: funnelId,
        name: `${funnelData.productName} (${funnelData.mainKeyword})`,
        updatedAt: now,
        data: funnelData
      });
    }
  } else {
    // Create new
    funnelId = generateId();
    newFunnels.push({
      id: funnelId,
      name: `${funnelData.productName} (${funnelData.mainKeyword})`,
      updatedAt: now,
      data: funnelData
    });
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(newFunnels));
  return funnelId;
}

export function deleteFunnel(id: string) {
  const funnels = getSavedFunnels().filter(f => f.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(funnels));
}

export function getFunnelById(id: string): SavedFunnel | undefined {
  return getSavedFunnels().find(f => f.id === id);
}
