/**
 * Prompt engineering logic for content generation.
 * Separated from API calling logic for maintainability and testability.
 */

import type { 
  UserConfig, 
  SlotType, 
  SlotGenerationRequest, 
  CoreNarrativeRequest,
  TemplateFieldDefinition,
  MapNarrativeToSlotsRequest,
  RegenerateSlotRequest,
} from './types';

/**
 * Build the prompt for generating the core narrative (Step 1).
 */
export function buildCoreNarrativePrompt(request: CoreNarrativeRequest): string {
  const { userConfig } = request;

  const audienceParts: string[] = [];
  if (userConfig.ageRange && userConfig.ageRange !== 'all') audienceParts.push(`age range ${userConfig.ageRange}`);
  if (userConfig.gender && userConfig.gender !== 'all') audienceParts.push(userConfig.gender);
  if (userConfig.country) audienceParts.push(userConfig.country);
  if (userConfig.targetStates && userConfig.targetStates.length > 0) {
    audienceParts.push(userConfig.targetStates.join(', '));
  } else if (userConfig.state) {
    audienceParts.push(userConfig.state);
  }
  const audienceContext = audienceParts.length > 0 ? `Target audience: ${audienceParts.join(', ')}. ` : '';

  let regionalInstructions = '';
  if (userConfig.targetStates && userConfig.targetStates.length > 0) {
    const statesList = userConfig.targetStates.join(', ');
    regionalInstructions = `\n\n**PSYCHOGRAPHIC TARGETING:** Analyze the mindset of ${statesList}. Adapt tone/values accordingly. DO NOT mention specific cities.`;
  }

  const toneInstruction = `Use a ${userConfig.tone || 'professional'} tone.`;

  return `You are a professional copywriter. Create a comprehensive master narrative.

Product: ${userConfig.productName}
Target Keywords: ${userConfig.mainKeyword} (Treat these as the core topics to cover)
${audienceContext}${toneInstruction}${regionalInstructions}

**REQUIREMENTS:**
1. Create a complete narrative (Hook, Problem, Solution, Mechanism, Value).
2. **KEYWORD USAGE:** Naturally weave the "Target Keywords" into the story. Do not stuff them, but ensure the narrative touches on these themes.
3. Internally consistent and scientifically accurate.
4. Approx 800-1200 words.

Respond with ONLY the narrative text.`;
}

/**
 * Build the prompt for generating a specific slot from the core narrative.
 */
export function buildSlotGenerationPrompt(request: SlotGenerationRequest): string {
  const { slotType, coreNarrative, userConfig, slotInstructions, maxLength } = request;

  return `Extract content from Narrative.

Narrative: ${coreNarrative}
Task: Write a ${slotType}.
${maxLength ? `MAX LENGTH: ${maxLength} chars.` : ''}
${slotInstructions || ''}

Response: ONLY content.`;
}

/**
 * Build the prompt for mapping core narrative to template slots.
 * LABEL MODE: Expanded to < 85 chars. Headlines capped at 8 words.
 */
export function buildMapNarrativeToSlotsPrompt(request: MapNarrativeToSlotsRequest): string {
  const { coreNarrative, templateFields, userConfig } = request;

  const validFields = templateFields.filter(
    (f): f is NonNullable<typeof f> => f != null && f.slotId != null
  );

  if (validFields.length === 0) {
    throw new Error('No valid template fields provided');
  }

  // PARANOID MATH:
  // 1 word = 10 characters. (Extremely conservative)
  // 64 chars -> 6 words.
  const getSafeWordCount = (chars: number) => Math.max(1, Math.floor(chars / 10));

  const enhancedFieldDescriptions = validFields.map((field) => {
    // NOTE: We intentionally ignore 'originalContent' here so the AI
    // is NOT biased by the placeholder text.
    const tag = (field.tagName || '').toLowerCase();
    const maxLen = field.maxLength ?? 1000;
    const safeWords = getSafeWordCount(maxLen);

    // Original content is used ONLY for list detection logic, NEVER shown to AI.
    const orig = field.originalContent || '';

    let inferredType: string;
    let strictInstruction = '';

    // 1. Lists
    if (tag === 'ul' || tag === 'ol' || field.slotType === 'list') {
      const itemCount = orig.includes('\n') ? orig.split('\n').filter(Boolean).length : 0;
      inferredType = itemCount > 0 ? `List (~${itemCount} items)` : 'List (3 items)';
    }
    // 2. LABEL MODE (Expanded to < 85 chars)
    // This catches your 64-char subheadlines and forces them to be labels.
    else if (maxLen < 85) {
      inferredType = `LABEL (Fragment)`;
      strictInstruction = `[CRITICAL: Write exactly ${safeWords} words. NO SENTENCES. NO VERBS. NO LISTS. Just a short label.]`;
    }
    // 3. SUBHEADLINES (Strict Cap)
    else if (field.slotType === 'headline' || field.slotType === 'subheadline') {
      inferredType = `HEADLINE`;
      // Cap headlines at 8 words max, even if character limit allows more
      const headlineWords = Math.min(safeWords, 8);
      strictInstruction = `[CRITICAL: Max ${headlineWords} words. Short phrase only.]`;
    }
    // 4. Paragraphs
    else {
      inferredType = `Paragraph`;
      strictInstruction = `[CRITICAL: Stop writing after ${safeWords} words.]`;
    }

    let desc = `- "${field.slotId}" (Limit ${maxLen} chars): ${strictInstruction} → Target: ${safeWords} words → ${inferredType}`;

    // *** FIX: REMOVED REFERENCE INJECTION ***
    // We do NOT append the (Ref: ...) line anymore.
    // This forces the AI to write from scratch.

    return desc;
  }).join('\n');

  const prompt = `You are a professional copywriter. Fill the slots below from the Core Narrative.

**THE LAW OF LENGTH:**
You are technically constrained.
- **IF LIMIT < 85 CHARS:** You are writing a LABEL.
  - BAD: "Choosing the best supplement involves checking purity." (Sentence = FAIL)
  - GOOD: "Choosing a Supplement" (Label = PASS)
- **SUBHEADLINES:** Never list keywords. Write a cohesive short phrase.

**Core Narrative:**
${coreNarrative}

**Slots to Fill:**
${enhancedFieldDescriptions}

**Tone:** ${userConfig.tone}

**Requirements:**
1. **JSON ONLY:** Return a valid JSON object.
2. **Short Means Short:** Use Title Case for labels.
3. **No HTML:** Plain text only.
4. **FRESH CONTENT:** Do not try to guess what was there before. Write purely based on the new product narrative.

**Response Format:**
{
  "slot_id": "content..."
}`;

  return prompt;
}

/**
 * Build the prompt for regenerating a single slot.
 * FIXED: Uses the same LABEL MODE logic.
 */
export function buildRegenerateSlotPrompt(request: RegenerateSlotRequest): string {
  const { slotId, slotType, coreNarrative, maxLength } = request;

  const safeWords = maxLength ? Math.max(1, Math.floor(maxLength / 8)) : 10;
  const isLabelMode = maxLength != null && maxLength < 60;
  const isHeadlineMode = maxLength != null && maxLength < 120;

  let taskInstruction = '';
  if (isLabelMode) {
    taskInstruction = `Write a LABEL (Fragment). Max ${safeWords} words. NO VERBS. NO SENTENCES. NO PERIODS.`;
  } else if (isHeadlineMode || slotType === 'subheadline') {
    taskInstruction = `Write a HEADLINE/SUBHEADLINE. Max ${safeWords} words. Short phrase only. NO full sentences.`;
  } else {
    taskInstruction = `Write a Paragraph. Target approx ${safeWords} words.`;
  }

  return `Regenerate content for slot "${slotId}" from Narrative.

Narrative: ${coreNarrative}

**STRICT CONSTRAINT:**
- Max Characters: ${maxLength ?? 'None'}
- Target Length: ~${safeWords} words
- TASK: ${taskInstruction}

If target is < 5 words, write a LABEL (e.g. "Health Benefits") not a sentence.

Response: Plain text content only.`;
}

export function extractJsonFromResponse(response: string): string {
  let jsonContent = response.trim();
  if (jsonContent.startsWith('```json')) {
    jsonContent = jsonContent.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
  } else if (jsonContent.startsWith('```')) {
    jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return jsonContent;
}

export function sanitizeJsonString(jsonString: string): string {
  return jsonString.replace(/[\u0000-\u001F]+/g, "");
}

export function repairJsonString(jsonString: string): string {
  return jsonString;
}
