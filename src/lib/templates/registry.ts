import type { TemplateConfig, TemplateMeta } from "./types";

export type TemplateId = string; // All template IDs are now dynamic (uploaded templates)

/**
 * Full template definitions - includes HTML, CSS, and slots.
 * This is the single source of truth for all templates (system and uploaded).
 * 
 * System templates are now empty by default - users must upload their own templates.
 */
const TEMPLATE_DEFINITIONS: Record<string, TemplateConfig> = {};

/**
 * Get the full template configuration by ID.
 * Works for both system templates and uploaded templates.
 * 
 * Note: For uploaded templates, you need to pass them in or load them separately.
 * This function only returns system templates. Use loadUploadedTemplates() 
 * from uploadedStorage to get uploaded templates.
 */
export function getTemplateConfigById(id: TemplateId): TemplateConfig | undefined {
  // Check system templates
  if (TEMPLATE_DEFINITIONS[id]) {
    return TEMPLATE_DEFINITIONS[id];
  }
  
  // For uploaded templates, they are stored in localStorage
  // The caller should check uploaded templates separately
  return undefined;
}

/**
 * Template metadata for listing/selection UI.
 * This is a lightweight version used in dropdowns and lists.
 * 
 * System templates are now empty by default - users must upload their own templates.
 */
export const TEMPLATES: TemplateMeta[] = [];

export function getTemplateById(id: TemplateId): TemplateMeta | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

