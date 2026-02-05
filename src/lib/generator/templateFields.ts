/**
 * Template Field Definitions
 * Defines the content slots available in each template.
 * Used for mapping core narrative to specific slots.
 */

import type { TemplateFieldDefinition } from './types';
import type { TemplateConfig, TemplateSlot } from '@/lib/templates/types';

/**
 * Map uploaded template slot type to our SlotType.
 * SIMPLIFIED: No CTAs, No Images.
 */
function mapSlotType(uploadedType: string): TemplateFieldDefinition['slotType'] {
  const typeMap: Record<string, TemplateFieldDefinition['slotType']> = {
    text: 'paragraph',
    headline: 'headline',
    subheadline: 'subheadline',
    paragraph: 'paragraph',
    list: 'list',
    'rich-text': 'paragraph',
    cta: 'headline',
    image: 'paragraph',
    url: 'headline',
  };
  return typeMap[uploadedType] || 'paragraph';
}

/**
 * Get template field definitions for ANY template.
 */
export function getTemplateFields(template: TemplateConfig): TemplateFieldDefinition[] {
  if (!template?.slots?.length) return [];
  return template.slots
    .filter((s): s is NonNullable<typeof s> =>
      s != null &&
      s.id != null &&
      s.type !== 'image' &&
      s.type !== 'cta'
    )
    .map(slot => slotToField(slot));
}

function slotToField(slot: TemplateSlot): TemplateFieldDefinition {
  let slotType = mapSlotType(slot.type || 'paragraph');
  const contentLen = (slot.originalContent || '').length;

  // 1. Calculate base maxLength
  let maxLength = slot.maxLength ?? getSmartMaxLength(slot);

  if (maxLength == null) {
    if (slotType === 'headline') maxLength = 60;
    else if (slotType === 'list') maxLength = 800;
    else maxLength = 500;
  }

  // 2. AGGRESSIVE CORRECTION:
  // Force short text (< 120 chars) to be Headlines.
  // This prevents "Information About NMN" (21 chars) from becoming a paragraph.
  if (contentLen > 0 && contentLen < 120) {
    slotType = 'headline';
    maxLength = Math.min(contentLen + 15, 120);
  } else if (maxLength < 120) {
    slotType = 'headline';
  }

  return {
    slotId: slot.id,
    label: slot.label,
    slotType,
    description: `Content slot: ${slot.label}`,
    maxLength,
    tagName: slot.tagName,
    originalContent: slot.originalContent ?? '',
    ...(slot.wordCount != null ? { wordCount: slot.wordCount } : {}),
  };
}

function getSmartMaxLength(slot: TemplateSlot): number | undefined {
  const tag = (slot.tagName || '').toLowerCase();
  const len = (slot.originalContent || '').length;
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) return len + 15;
  return undefined;
}

/**
 * Get template field definitions for the CreatineReport template.
 */
export function getCreatineReportFields(): TemplateFieldDefinition[] {
  return [
    {
      slotId: 'pageHeadline',
      label: 'Page Headline',
      slotType: 'headline',
      description: 'Main page headline that captures the hook',
      maxLength: 80,
      instructions: 'Should naturally incorporate the main keyword',
    },
    {
      slotId: 'introParagraph',
      label: 'Intro Paragraph',
      slotType: 'paragraph',
      description: 'Introduction paragraph that addresses the main keyword/topic',
      maxLength: 500,
      instructions: '3-5 sentences introducing the product and topic',
    },
    {
      slotId: 'mainBenefits',
      label: 'Main Benefits',
      slotType: 'list',
      description: 'List of key benefits (one per line)',
      maxLength: 800,
      instructions: '5-8 key benefits, each as a complete sentence or phrase',
    },
    {
      slotId: 'effectivenessParagraphs',
      label: 'Effectiveness Paragraphs',
      slotType: 'paragraph',
      description: 'Paragraphs explaining product effectiveness',
      maxLength: 1500,
      instructions: 'Multiple paragraphs (one per line) about how the product works',
    },
    {
      slotId: 'comparisonParagraphs',
      label: 'Comparison Paragraphs',
      slotType: 'paragraph',
      description: 'Paragraphs comparing the product to alternatives',
      maxLength: 1500,
      instructions: 'Multiple paragraphs (one per line) comparing to competitors',
    },
    {
      slotId: 'reviewParagraphs',
      label: 'Review Paragraphs',
      slotType: 'paragraph',
      description: 'Customer review and testimonial paragraphs',
      maxLength: 1500,
      instructions: 'Multiple paragraphs (one per line) with customer feedback',
    },
    {
      slotId: 'bottomLineParagraph',
      label: 'Bottom Line Paragraph',
      slotType: 'paragraph',
      description: 'Concluding paragraph summarizing the value proposition',
      maxLength: 500,
      instructions: 'Strong conclusion that reinforces the main message',
    },
    {
      slotId: 'sidebarDiscoverItems',
      label: 'Sidebar Discover Items',
      slotType: 'list',
      description: 'Items for "Discover" section in sidebar',
      maxLength: 400,
      instructions: 'List of topics (one per line) related to the product',
    },
    {
      slotId: 'sidebarTopItems',
      label: 'Sidebar Top Items',
      slotType: 'list',
      description: 'Top items to consider in sidebar',
      maxLength: 400,
      instructions: 'List of considerations (one per line) when choosing the product',
    },
    {
      slotId: 'newsletterTitle',
      label: 'Newsletter Title',
      slotType: 'headline',
      description: 'Title for newsletter signup section',
      maxLength: 60,
    },
    {
      slotId: 'newsletterDesc',
      label: 'Newsletter Description',
      slotType: 'paragraph',
      description: 'Description for newsletter signup section',
      maxLength: 200,
    },
  ];
}

/**
 * Get template field definitions for an uploaded template.
 * CRITICAL: Passes through tagName, originalContent, and maxLength to the AI.
 */
export function getUploadedTemplateFields(
  slots: TemplateSlot[]
): TemplateFieldDefinition[] {
  return slots
    .filter((s): s is NonNullable<typeof s> =>
      s != null && s.id != null && s.type !== 'image' && s.type !== 'cta'
    )
    .map(slot => slotToField(slot));
}
