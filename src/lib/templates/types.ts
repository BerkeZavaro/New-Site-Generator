/**
 * Unified template types.
 * Updated to include Image Dimensions for the "Image Studio".
 */

export type SlotType = "headline" | "subheadline" | "paragraph" | "list" | "image" | "cta";

export type TemplateSlot = {
  id: string;
  type: SlotType;
  label: string;
  tagName?: string;
  originalContent?: string;
  wordCount?: number;
  maxLength?: number;
  /** Stores the raw HTML attributes (class, style, etc.) for perfect cloning */
  attributes?: string;
  /** Image specific metadata for the Image Studio */
  width?: number;
  height?: number;
};

export type TemplateConfig = {
  id: string;
  name: string;
  description?: string;
  htmlBody: string; // The "Master Shell" with data-slot IDs injected
  css?: string;
  headContent?: string;
  slots: TemplateSlot[];
  createdAt?: string;
  createdBy?: "system" | "uploaded";
};

export type TemplateMeta = {
  id: string;
  name: string;
  description: string;
  supportsSidebar?: boolean;
  createdBy: "system" | "uploaded";
};
