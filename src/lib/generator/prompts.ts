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
  const { userConfig, narrativeInstructions } = request;

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
    regionalInstructions = `\n\n**PSYCHOGRAPHIC TARGETING:** Analyze the mindset of ${statesList}. Adapt tone and values accordingly (e.g., individualistic vs community-focused). DO NOT mention specific cities.`;
  }

  const toneInstruction = `Use a ${userConfig.tone || 'professional'} tone.`;

  return `You are a professional copywriter. Create a comprehensive master narrative.

Product: ${userConfig.productName}
Keyword: ${userConfig.mainKeyword}
${audienceContext}${toneInstruction}${regionalInstructions}

**REQUIREMENTS:**
1. Create a complete narrative (Hook, Problem, Solution, Mechanism, Value).
2. Internally consistent and scientifically accurate.
3. Approx 800-1200 words.

${narrativeInstructions ? `\n**Additional Instructions:**\n${narrativeInstructions}\n` : ''}

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
 * ULTRA-STRICT LIMITS implemented here.
 */
export function buildMapNarrativeToSlotsPrompt(request: MapNarrativeToSlotsRequest): string {
  const { coreNarrative, templateFields, userConfig } = request;

  const validFields = templateFields.filter(
    (f): f is NonNullable<typeof f> => f != null && f.slotId != null
  );

  if (validFields.length === 0) {
    throw new Error('No valid template fields provided');
  }

  // ULTRA-SAFE MATH:
  // We assume 1 word = 7.5 characters.
  // Example: 36 chars / 7.5 = 4.8 -> 4 words.
  const getSafeWordCount = (chars: number) => Math.max(1, Math.floor(chars / 7.5));

  const enhancedFieldDescriptions = validFields.map((field) => {
    const orig = field.originalContent || '';
    const tag = (field.tagName || '').toLowerCase();
    const maxLen = field.maxLength ?? 1000;
    const safeWords = getSafeWordCount(maxLen);

    // STRICT TYPE INFERENCE
    let inferredType: string;
    let strictInstruction = '';

    // 1. Lists
    if (tag === 'ul' || tag === 'ol' || field.slotType === 'list') {
      const itemCount = orig.includes('\n') ? orig.split('\n').filter(Boolean).length : 0;
      inferredType = itemCount > 0 ? `List (~${itemCount} items)` : 'List (3 items)';
    }
    // 2. Headlines / Short Text
    else if (field.slotType === 'headline' || field.slotType === 'subheadline' || maxLen < 60) {
      inferredType = 'HEADLINE';
      strictInstruction = `[CRITICAL: Write exactly ${safeWords} words. NO SENTENCES. Fragment only.]`;
    }
    // 3. Paragraphs
    else {
      inferredType = 'Paragraph';
      strictInstruction = `[CRITICAL: Stop writing after ${safeWords} words.]`;
    }

    let desc = `- "${field.slotId}" (Limit ${maxLen} chars): ${strictInstruction} → Write ~${safeWords} words → ${inferredType}`;

    if (orig) {
      const refPreview = orig.length > 50 ? orig.substring(0, 50) + '...' : orig;
      desc += `\n  (Ref: "${refPreview}")`;
    }
    return desc;
  }).join('\n');

  const prompt = `You are a professional copywriter. Fill the slots below from the Core Narrative.

**THE LAW OF LENGTH:**
You are technically constrained.
- If a slot allows **36 characters** (~4 words), you MUST NOT write a sentence. Write a label.
  - BAD: "NMN helps your cells grow." (Too long)
  - GOOD: "NMN Benefits" (Perfect)

**Core Narrative:**
${coreNarrative}

**Slots to Fill:**
${enhancedFieldDescriptions}

**Tone:** ${userConfig.tone}

**Requirements:**
1. **JSON ONLY:** Return a valid JSON object.
2. **Short Means Short:** If the word count target is < 5, do not use verbs. Use Title Case labels.
3. **No HTML:** Plain text only.

**Response Format:**
{
  "slot_id": "content..."
}`;

  return prompt;
}

/**
 * Build the prompt for regenerating a single slot with core narrative context.
 */
export function buildRegenerateSlotPrompt(request: RegenerateSlotRequest): string {
  const { slotId, slotType, coreNarrative, maxLength } = request;
  const safeWords = maxLength ? Math.max(1, Math.floor(maxLength / 7.5)) : 10;

  return `Regenerate content for slot "${slotId}" from Narrative.

Narrative: ${coreNarrative}

CONSTRAINT: Max ${maxLength ?? 80} characters.
TARGET: Approx ${safeWords} words.

If target is < 5 words, write a LABEL (no full sentences).

Response: Plain text content only.`;
}

/**
 * Helper to extract JSON from AI responses that might be wrapped in markdown.
 */
export function extractJsonFromResponse(response: string): string {
  let jsonContent = response.trim();
  
  // Remove markdown code blocks if present
  if (jsonContent.startsWith('```json')) {
    jsonContent = jsonContent.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
  } else if (jsonContent.startsWith('```')) {
    jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  return jsonContent;
}

/**
 * Sanitize JSON string by properly escaping control characters in string values.
 * This fixes issues where AI responses contain unescaped newlines, tabs, etc.
 * Uses a careful approach to preserve valid JSON structure and escape sequences.
 */
export function sanitizeJsonString(jsonString: string): string {
  let result = jsonString;
  let inString = false;
  let escapeNext = false;
  let output = '';
  
  for (let i = 0; i < result.length; i++) {
    const char = result[i];
    const code = char.charCodeAt(0);
    
    if (escapeNext) {
      // We're in an escape sequence, preserve it as-is
      output += char;
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      // Start of escape sequence
      output += char;
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      // Toggle string state
      inString = !inString;
      output += char;
      continue;
    }
    
    if (inString) {
      // We're inside a string value
      // Check if this is an unescaped control character
      if ((code >= 0x00 && code <= 0x1F) || code === 0x7F) {
        // Escape the control character
        if (char === '\n') {
          output += '\\n';
        } else if (char === '\r') {
          output += '\\r';
        } else if (char === '\t') {
          output += '\\t';
        } else if (char === '\b') {
          output += '\\b';
        } else if (char === '\f') {
          output += '\\f';
        } else {
          // Use Unicode escape for other control characters
          const hex = code.toString(16).padStart(4, '0');
          output += `\\u${hex}`;
        }
      } else {
        output += char;
      }
    } else {
      // Outside string, copy as-is
      output += char;
    }
  }
  
  return output;
}

/**
 * Repair malformed JSON by fixing common issues:
 * - Unterminated strings
 * - Unescaped quotes in strings
 * - Missing closing braces/brackets
 * - Truncated responses
 */
export function repairJsonString(jsonString: string): string {
  let result = jsonString.trim();
  let inString = false;
  let escapeNext = false;
  let output = '';
  let braceDepth = 0;
  let bracketDepth = 0;
  let lastChar = '';
  let stringStartPos = -1;
  
  // Find the start of the JSON object (first {)
  let startIdx = result.indexOf('{');
  if (startIdx === -1) {
    // No opening brace found, try to construct one
    return `{${result}}`;
  }
  
  // Find the last closing brace to handle truncation
  let endIdx = result.lastIndexOf('}');
  if (endIdx === -1 || endIdx < startIdx) {
    endIdx = result.length;
  } else {
    endIdx = endIdx + 1; // Include the closing brace
  }
  
  // Process the JSON content
  for (let i = startIdx; i < endIdx; i++) {
    const char = result[i];
    const code = char.charCodeAt(0);
    
    if (escapeNext) {
      output += char;
      escapeNext = false;
      lastChar = char;
      continue;
    }
    
    if (char === '\\') {
      output += char;
      escapeNext = true;
      lastChar = char;
      continue;
    }
    
    if (char === '"') {
      if (!inString) {
        stringStartPos = i;
      }
      inString = !inString;
      output += char;
      lastChar = char;
      continue;
    }
    
    if (inString) {
      // Inside a string - escape control characters
      if ((code >= 0x00 && code <= 0x1F) || code === 0x7F) {
        // Escape control characters
        if (char === '\n') {
          output += '\\n';
        } else if (char === '\r') {
          output += '\\r';
        } else if (char === '\t') {
          output += '\\t';
        } else if (char === '\b') {
          output += '\\b';
        } else if (char === '\f') {
          output += '\\f';
        } else {
          const hex = code.toString(16).padStart(4, '0');
          output += `\\u${hex}`;
        }
      } else {
        output += char;
      }
      lastChar = char;
    } else {
      // Outside string - track braces and brackets
      if (char === '{') {
        braceDepth++;
        output += char;
      } else if (char === '}') {
        braceDepth--;
        output += char;
      } else if (char === '[') {
        bracketDepth++;
        output += char;
      } else if (char === ']') {
        bracketDepth--;
        output += char;
      } else {
        output += char;
      }
      lastChar = char;
    }
  }
  
  // If we ended inside a string, try to close it intelligently
  if (inString) {
    // Check if we're in the middle of a value (after a colon)
    const lastColon = output.lastIndexOf(':');
    const lastComma = output.lastIndexOf(',');
    if (lastColon > lastComma) {
      // We're in a value, close the string
      output += '"';
      inString = false;
    } else {
      // We might be in a key, this is more problematic
      // Try to find where the string should have ended
      const remaining = result.substring(endIdx);
      const nextQuote = remaining.indexOf('"');
      if (nextQuote !== -1 && nextQuote < 100) {
        // Found a quote nearby, the string might have been split
        // Just close it here
        output += '"';
        inString = false;
      } else {
        // Truncated string, close it
        output += '"';
        inString = false;
      }
    }
  }
  
  // Close any unclosed braces or brackets
  while (braceDepth > 0) {
    // Before closing, check if we need a comma
    if (output.trim().length > 0 && !output.trim().endsWith(',') && !output.trim().endsWith('{') && !output.trim().endsWith('[')) {
      output += ',';
    }
    output += '}';
    braceDepth--;
  }
  while (bracketDepth > 0) {
    output += ']';
    bracketDepth--;
  }
  
  return output;
}
