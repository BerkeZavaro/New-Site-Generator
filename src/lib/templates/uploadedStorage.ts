import type { UploadedTemplate } from "./uploadedTypes";
import {
  safeSetItem,
  StorageQuotaExceededError,
  getValueUtf16Bytes,
} from "@/lib/storage/quotaGuard";

const STORAGE_KEY = "site-generator:uploaded-templates";

export function loadUploadedTemplates(): UploadedTemplate[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed;
  } catch {
    return [];
  }
}

export function saveUploadedTemplates(list: UploadedTemplate[]): void {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify(list);
  const res = safeSetItem(STORAGE_KEY, payload);
  if (!res.ok) {
    if (res.reason === "quota") {
      console.error("[uploadedStorage] Quota exceeded — write aborted", {
        usageBytes: res.usageBytes,
        deltaBytes: res.attemptedBytes,
        payloadUtf16Bytes: getValueUtf16Bytes(payload),
      });
      throw new StorageQuotaExceededError(res.usageBytes, getValueUtf16Bytes(payload));
    }
    console.error("[uploadedStorage] localStorage write failed", res.error);
    throw res.error;
  }
}

export function addUploadedTemplate(t: UploadedTemplate): UploadedTemplate[] {
  const existing = loadUploadedTemplates();
  const withoutSame = existing.filter((x) => x.id !== t.id);
  const next = [...withoutSame, t];
  saveUploadedTemplates(next);
  return next;
}

export function deleteUploadedTemplate(id: string): UploadedTemplate[] {
  const existing = loadUploadedTemplates();
  const filtered = existing.filter((t) => t.id !== id);
  saveUploadedTemplates(filtered);
  return filtered;
}
