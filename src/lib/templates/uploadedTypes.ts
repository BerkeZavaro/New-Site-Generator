/**
 * @deprecated Use types from './types' instead.
 * This file is kept for backward compatibility but will be removed.
 */
import type { TemplateId } from "./registry";
import type { SlotType, TemplateSlot, TemplateConfig } from "./types";

// Re-export for backward compatibility
export type { SlotType, TemplateSlot };

/**
 * UploadedTemplate is now just an alias for TemplateConfig with required createdAt.
 * All templates (system and uploaded) should use TemplateConfig.
 */
export type UploadedTemplate = TemplateConfig & {
  id: TemplateId;
  createdAt: string;    // Required for uploaded templates
};
