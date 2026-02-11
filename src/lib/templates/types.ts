/**
 * Unified template types.
 * Updated to support "List Item Templates" (preserving checkmarks/icons).
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
  attributes?: string;
  width?: number;
  height?: number;
  /** Stores the HTML pattern of a list item (e.g. "<i class='check'></i> {{CONTENT}}") */
  listTemplate?: string;
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
