/** Conservative localStorage budget per origin (bytes). */
export const STORAGE_BUDGET_BYTES = 5 * 1024 * 1024;

function utf16StorageBytes(s: string): number {
  return s.length * 2;
}

export function getStorageUsageBytes(): number {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return 0;
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key == null) continue;
    const value = localStorage.getItem(key) ?? "";
    total += utf16StorageBytes(key) + utf16StorageBytes(value);
  }
  return total;
}

/**
 * Current usage as a percentage of the 5MB budget.
 * Values may exceed 100; clamp only for typical display caps if needed by caller.
 */
export function getStorageUsagePercent(): number {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return 0;
  return (getStorageUsageBytes() / STORAGE_BUDGET_BYTES) * 100;
}

/** Delta in UTF-16 storage bytes if `newValue` replaces whatever is stored under `newKey`. */
export function getSetItemDeltaBytes(newKey: string, newValue: string): number {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return 0;
  const existing = localStorage.getItem(newKey);
  if (existing === null) {
    return utf16StorageBytes(newKey) + utf16StorageBytes(newValue);
  }
  return utf16StorageBytes(newValue) - utf16StorageBytes(existing);
}

export function wouldExceedQuota(newKey: string, newValue: string): boolean {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return false;
  const projected = getStorageUsageBytes() + getSetItemDeltaBytes(newKey, newValue);
  return projected > STORAGE_BUDGET_BYTES;
}

export type SafeSetItemResult =
  | { ok: true }
  | { ok: false; reason: "quota"; usageBytes: number; attemptedBytes: number }
  | { ok: false; reason: "unknown"; error: Error };

export function safeSetItem(key: string, value: string): SafeSetItemResult {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return { ok: false, reason: "unknown", error: new Error("localStorage unavailable") };
  }

  const usageBytes = getStorageUsageBytes();
  const attemptedBytes = getSetItemDeltaBytes(key, value);

  if (wouldExceedQuota(key, value)) {
    return { ok: false, reason: "quota", usageBytes, attemptedBytes };
  }

  try {
    localStorage.setItem(key, value);
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    const isQuota =
      error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      /quota/i.test(error.message) ||
      /exceeded/i.test(error.message);
    if (isQuota) {
      return {
        ok: false,
        reason: "quota",
        usageBytes: getStorageUsageBytes(),
        attemptedBytes: getSetItemDeltaBytes(key, value),
      };
    }
    return { ok: false, reason: "unknown", error };
  }
}

/** UTF-16 byte size of the value string (for “item being saved” copy). */
export function getValueUtf16Bytes(value: string): number {
  return utf16StorageBytes(value);
}

/**
 * User-visible message when a write would exceed or hit quota.
 * `itemUtf16Bytes` should be the payload being saved (e.g. JSON string for one key).
 */
export function formatStorageFullBannerMessage(usageBytes: number, itemUtf16Bytes: number): string {
  const usedMb = (usageBytes / (1024 * 1024)).toFixed(1);
  const itemMb = itemUtf16Bytes / (1024 * 1024);
  const itemStr =
    itemMb >= 1 ? `${itemMb.toFixed(1)} MB` : `${(itemUtf16Bytes / 1024).toFixed(1)} KB`;
  return `Storage full. This browser only allows 5MB of storage per site. You have used ${usedMb} MB of 5.0 MB. The item being saved is ${itemStr}. To continue, please delete some funnels or templates you no longer need.`;
}

/** Thrown when a guarded localStorage write cannot complete due to quota. */
export class StorageQuotaExceededError extends Error {
  override readonly name = "QuotaExceededError";
  readonly usageBytes: number;
  /** UTF-16 byte length of the value payload that failed to persist. */
  readonly attemptedBytes: number;

  constructor(usageBytes: number, attemptedItemUtf16Bytes: number) {
    super("Storage quota exceeded");
    this.usageBytes = usageBytes;
    this.attemptedBytes = attemptedItemUtf16Bytes;
  }
}

export function isStorageQuotaExceededError(e: unknown): e is StorageQuotaExceededError {
  return e instanceof StorageQuotaExceededError || (e instanceof Error && e.name === "QuotaExceededError");
}
