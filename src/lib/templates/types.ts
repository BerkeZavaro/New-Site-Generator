/**
 * Unified template types.
 * Updated to include 'attributes' for preserving original CSS classes.
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
  /** Stores the raw HTML attributes (e.g. 'class="my-class" style="..."') */
  attributes?: string;
};

export type TemplateConfig = {
  id: string;
  name: string;
  description?: string;
  htmlBody: string;
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

