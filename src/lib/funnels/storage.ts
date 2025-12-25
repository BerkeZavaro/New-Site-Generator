import type { FunnelConfig } from "./types";

const STORAGE_KEY = "site-generator:funnels";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadFunnels(): FunnelConfig[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load funnels from localStorage:", error);
    return [];
  }
}

export function saveFunnels(list: FunnelConfig[]): void {
  if (!isBrowser()) {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (error) {
    console.error("Failed to save funnels to localStorage:", error);
  }
}

export function upsertFunnel(funnel: FunnelConfig): FunnelConfig[] {
  const funnels = loadFunnels();
  const existingIndex = funnels.findIndex((f) => f.id === funnel.id);

  if (existingIndex >= 0) {
    // Update existing
    funnels[existingIndex] = funnel;
  } else {
    // Insert new
    funnels.push(funnel);
  }

  saveFunnels(funnels);
  return funnels;
}

export function getFunnelById(id: string): FunnelConfig | undefined {
  const funnels = loadFunnels();
  return funnels.find((f) => f.id === id);
}

export function deleteFunnel(id: string): FunnelConfig[] {
  const funnels = loadFunnels();
  const filtered = funnels.filter((f) => f.id !== id);
  saveFunnels(filtered);
  return filtered;
}

export function duplicateFunnel(id: string): FunnelConfig | null {
  const funnels = loadFunnels();
  const original = funnels.find((f) => f.id === id);
  
  if (!original) {
    return null;
  }
  
  // Create a duplicate with new ID and name
  const duplicate: FunnelConfig = {
    ...original,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: `${original.name} (Copy)`,
    createdAt: new Date().toISOString(),
  };
  
  // Save the duplicate
  upsertFunnel(duplicate);
  return duplicate;
}

