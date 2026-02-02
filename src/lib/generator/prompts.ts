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
 * This creates a comprehensive "master article" that serves as the source of truth.
 */
export function buildCoreNarrativePrompt(request: CoreNarrativeRequest): string {
  const { userConfig, narrativeInstructions } = request;
  
  // Build audience context
  const audienceParts: string[] = [];
  if (userConfig.ageRange && userConfig.ageRange !== 'all') {
    audienceParts.push(`age range ${userConfig.ageRange}`);
  }
  if (userConfig.gender && userConfig.gender !== 'all') {
    audienceParts.push(userConfig.gender);
  }
  if (userConfig.country) {
    audienceParts.push(userConfig.country);
  }
  // Use targetStates array if available, otherwise fall back to single state
  if (userConfig.targetStates && userConfig.targetStates.length > 0) {
    audienceParts.push(userConfig.targetStates.join(', '));
  } else if (userConfig.state) {
    audienceParts.push(userConfig.state);
  }
  const audienceContext = audienceParts.length > 0
    ? `Target audience: ${audienceParts.join(', ')}. `
    : '';

  // Build psychographic customization instructions (not geographic)
  let regionalInstructions = '';
  if (userConfig.targetStates && userConfig.targetStates.length > 0) {
    const statesList = userConfig.targetStates.length === 1 
      ? userConfig.targetStates[0]
      : userConfig.targetStates.length === 2
      ? userConfig.targetStates.join(' and ')
      : `${userConfig.targetStates.slice(0, -1).join(', ')}, and ${userConfig.targetStates[userConfig.targetStates.length - 1]}`;
    
    regionalInstructions = `\n\n**PSYCHOGRAPHIC TARGETING (CRITICAL - NOT GEOGRAPHIC):**
The target audience fits the psychographic profile typical of ${statesList}. Your task is to analyze the sociology, lifestyle values, and cultural mindset associated with this region, then adapt the copy's tone, metaphors, and priorities accordingly.

**What to DO:**
- Analyze the underlying values and mindset (e.g., "Colorado" = active, outdoorsy, health-conscious, value-driven, rugged individualism; "New York" = fast-paced, efficiency-focused, status-driven, results-oriented; "Texas" = independent, practical, family-centric, no-nonsense)
- Adjust the tone to match these psychographic traits (e.g., more direct and efficient for fast-paced regions, more value-focused for cost-conscious regions, more aspirational for status-driven regions)
- Use metaphors and examples that resonate with these values (e.g., outdoor/active metaphors for health-conscious regions, efficiency/productivity metaphors for fast-paced regions)
- Prioritize messaging that aligns with their cultural mindset (e.g., emphasize independence and self-reliance for individualistic regions, emphasize family benefits for family-centric regions)

**What NOT to DO (STRICT PROHIBITION):**
- DO NOT mention specific city names (e.g., "Boulder", "Austin", "Denver", "Manhattan")
- DO NOT mention specific landmarks, local businesses, or regional institutions
- DO NOT mention the state name itself unless absolutely necessary for context
- DO NOT use niche local expressions or regional slang
- DO NOT create content that would alienate customers from other regions

**Goal:** The copy should resonate with the mindset and values of someone from this psychographic profile while remaining applicable and welcoming to a national US audience. The content must feel culturally aligned without being geographically exclusive.`;
  } else {
    regionalInstructions = '\n\n**AUDIENCE:** General US audience.';
  }

  // Build tone instruction
  const toneInstructions: Record<string, string> = {
    serious: 'Use a serious, professional, and authoritative tone.',
    educational: 'Use an educational, informative, and helpful tone.',
    cheerful: 'Use a cheerful, upbeat, and positive tone.',
    direct: 'Use a direct, straightforward, and no-nonsense tone.',
  };
  const toneInstruction = toneInstructions[userConfig.tone.toLowerCase()] || 'Use a professional tone.';

  // Build pain points context
  const painPointsText = userConfig.painPoints && userConfig.painPoints.length > 0
    ? `\n\nKey pain points to address: ${userConfig.painPoints.join(', ')}.`
    : '';

  const basePrompt = `You are a professional copywriter specializing in supplement and health product marketing. Your task is to create a comprehensive, cohesive master narrative for a product landing page.

Product Name: ${userConfig.productName}
Main Keyword/Topic: ${userConfig.mainKeyword}
${audienceContext}${toneInstruction}${painPointsText}${regionalInstructions}

**CRITICAL REQUIREMENTS:**

1. Create a complete, cohesive narrative that covers:
   - A compelling hook that addresses the main keyword/topic
   - The problem or concern the target audience faces
   - The scientific mechanism of how the product works
   - How this product specifically addresses the problem
   - Common objections and how to address them
   - The value proposition and offer details
   - A strong conclusion that reinforces the main message

2. The narrative must be:
   - Internally consistent (no contradictions)
   - Scientifically accurate (avoid FDA-prohibited medical claims)
   - Tailored to the target audience (${audienceContext || 'general audience'})
   - Written in the requested tone: ${userConfig.tone}
   - Naturally incorporates the keyword "${userConfig.mainKeyword}" throughout

3. Write this as a complete, flowing article (800-1200 words). This will serve as the "source of truth" from which all page sections will be derived.

${narrativeInstructions ? `\n**Additional Instructions:**\n${narrativeInstructions}\n` : ''}

Respond with ONLY the narrative text. Do not include headers, titles, or formatting. Write as a continuous, flowing article.`;

  return basePrompt;
}

/**
 * Build the prompt for generating a specific slot from the core narrative (Step 2).
 * This ensures all slot content is derived from and consistent with the core narrative.
 */
export function buildSlotGenerationPrompt(request: SlotGenerationRequest): string {
  const { slotId, slotType, coreNarrative, userConfig, slotInstructions, maxLength } = request;

  // Build slot-specific instructions based on type
  const slotTypeInstructions: Record<SlotType, string> = {
    headline: 'Write a compelling headline (under 80 characters) that captures the main hook from the core narrative.',
    subheadline: 'Write a supporting subheadline that expands on the headline.',
    paragraph: 'Write a paragraph that summarizes or extracts key points from the core narrative.',
    bullet: 'Write a concise bullet point that highlights a specific benefit or feature.',
    list: 'Extract and format key points as a list.',
    cta: 'Write a clear, action-oriented call-to-action.',
    'meta-description': 'Write a meta description (under 160 characters) for SEO.',
    quote: 'Extract or create a compelling quote from the narrative.',
  };

  const typeInstruction = slotTypeInstructions[slotType] || 'Extract relevant content from the core narrative.';

  // Build audience context
  const audienceParts: string[] = [];
  if (userConfig.ageRange && userConfig.ageRange !== 'all') {
    audienceParts.push(`age range ${userConfig.ageRange}`);
  }
  if (userConfig.gender && userConfig.gender !== 'all') {
    audienceParts.push(userConfig.gender);
  }
  // Use targetStates array if available, otherwise fall back to single state
  if (userConfig.targetStates && userConfig.targetStates.length > 0) {
    audienceParts.push(userConfig.targetStates.join(', '));
  } else if (userConfig.state) {
    audienceParts.push(userConfig.state);
  }
  const audienceContext = audienceParts.length > 0
    ? `Target audience: ${audienceParts.join(', ')}. `
    : '';

  const lengthConstraint = maxLength
    ? `\n\n**STRICT - ALWAYS OBEY:** Maximum ${maxLength} characters. No exceptions.`
    : '';

  const customInstructions = slotInstructions
    ? `\n\n**Specific Instructions for this Slot:**\n${slotInstructions}`
    : '';

  const prompt = `You are a professional copywriter. Your task is to extract and adapt content from a provided Core Narrative to create a specific page element.

**Core Narrative (Source of Truth):**
${coreNarrative}

**Task:**
${typeInstruction}
${audienceContext}
${lengthConstraint}
${customInstructions}

**CRITICAL REQUIREMENTS:**
1. The content MUST be derived from and consistent with the Core Narrative above.
2. Do NOT introduce new information that contradicts or is not supported by the Core Narrative.
3. Maintain the same tone and messaging as the Core Narrative.
4. Ensure the content naturally incorporates the keyword "${userConfig.mainKeyword}" if relevant.
5. The content should be compelling and appropriate for the target audience.

Respond with ONLY the generated content. No explanations, no markdown formatting, just the content text.`;

  return prompt;
}

/**
 * Build the prompt for mapping core narrative to template slots.
 * This distributes the narrative content across all defined slots in a single operation.
 */
export function buildMapNarrativeToSlotsPrompt(request: MapNarrativeToSlotsRequest): string {
  const { coreNarrative, templateFields, userConfig } = request;

  // Validate and filter out any undefined/null fields
  const validFields = templateFields.filter(
    (f): f is NonNullable<typeof f> => f != null && f.slotId != null
  );

  if (validFields.length === 0) {
    throw new Error('No valid template fields provided for narrative mapping');
  }

  const wordCountFromStr = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

  // Put CHARACTER LIMIT FIRST - the AI must check limit before filling
  const enhancedFieldDescriptions = validFields.map((field) => {
    const orig = field.originalContent || '';
    const origWordCount = field.wordCount ?? wordCountFromStr(orig);
    const tag = (field.tagName || '').toLowerCase();
    const maxLen = field.maxLength ?? 1000;

    // STEP 1: LIMIT FIRST - this determines what to write
    let inferredType: string;
    if (maxLen < 80) {
      inferredType = 'HEADLINE (one short line, no periods)';
    } else if (tag === 'ul' || tag === 'ol' || field.slotType === 'list') {
      const itemCount = orig.includes('\n') ? orig.split('\n').filter(Boolean).length : 0;
      inferredType = itemCount > 0 ? `List (~${itemCount} items, one per line)` : 'List (one item per line)';
    } else if (tag === 'li') {
      inferredType = 'Single list item';
    } else if (tag === 'img') {
      inferredType = 'Image URL only';
    } else if ((tag === 'a' || field.slotType === 'cta') && maxLen < 80) {
      inferredType = 'Short CTA (one line, no periods)';
    } else {
      inferredType = `Paragraph (~${origWordCount || Math.floor(maxLen / 6)} words)`;
    }

    let desc = `- "${field.slotId}": **MAX ${maxLen} CHARACTERS** → ${inferredType} → ${field.label}`;
    if (orig) {
      const refPreview = orig.length > 50 ? orig.substring(0, 50) + '...' : orig;
      desc += `\n  (Ref Style: "${refPreview}")`;
    }
    return desc;
  }).join('\n');

  const prompt = `You are a professional copywriter. Your task is to fill template slots from a Core Narrative.

**YOUR PROCESS - FOLLOW THIS ORDER FOR EVERY SLOT:**
1. **FIRST** look at the character limit (MAX X CHARACTERS).
2. **THEN** infer the slot type from the limit: limit < 80 = headline; limit >= 80 = paragraph or list.
3. **THEN** write content that fits within that limit. Count your characters. Stay under.

Do NOT write a paragraph for a 36-character slot. A 36-character slot is a headline—write "Information About NMN", not a 451-character essay. Exceeding the limit breaks the layout.

**Core Narrative (Source of Truth):**
${coreNarrative}

**Template Fields to Fill (with structure requirements):**
${enhancedFieldDescriptions}

**IMPORTANT: You must provide content for ALL ${validFields.length} slots listed above.**
- Text slots (headings, paragraphs) = extract text content
- List slots = extract 3-8 key points, one per line
- Content blocks = extract multiple sentences
- **DO NOT skip any slots, especially lists or content blocks**

**Target Audience:** ${userConfig.ageRange || 'all'} ${userConfig.gender || 'all'}${userConfig.country ? ` in ${userConfig.country}` : ''}${userConfig.targetStates && userConfig.targetStates.length > 0 ? ` (psychographic profile: ${userConfig.targetStates.join(', ')})` : ''}
**Tone:** ${userConfig.tone}
**Main Keyword:** ${userConfig.mainKeyword}
${userConfig.targetStates && userConfig.targetStates.length > 0 
  ? `\n**Psychographic Targeting:** Adapt tone, metaphors, and priorities to match the cultural mindset and values typical of ${userConfig.targetStates.length === 1 ? userConfig.targetStates[0] : userConfig.targetStates.join(', ')}. DO NOT mention city names, landmarks, or state names. Focus on values and mindset, not geography.`
  : ''}

**CRITICAL REQUIREMENTS - READ CAREFULLY:**
1. **YOU MUST INCLUDE ALL ${validFields.length} SLOTS IN YOUR RESPONSE - NO EXCEPTIONS.** Every single slot ID listed above MUST appear as a key in your JSON response. Missing even ONE slot will cause the system to fail. Count your keys before responding - you must have exactly ${validFields.length} keys.
2. Extract content from the Core Narrative for each field. Do NOT create new content that isn't in the narrative.
3. **ALWAYS OBEY CHARACTER LIMITS - NO EXCEPTIONS:** Every slot has [STRICT LIMIT: Must be under X characters]. Headline, paragraph, list, CTA—you MUST stay under X for every single slot. No matter the type. Exceeding the limit crashes the system.
4. PRESERVE STRUCTURE: If a slot is labeled as "Headline" or "H1", it should be ONE LINE only. If it's "Paragraph" or "Body", it should be a full paragraph.
5. For headings (H1, H2, H3, etc.), extract or create a SINGLE LINE that captures the essence. Do NOT include paragraph text in headings.
6. For paragraphs, extract or adapt full paragraph content with multiple sentences.
7. **FOR LISTS (type: list, slot IDs containing "list"):** 
   - **THIS IS CRITICAL - LIST SLOTS ARE OFTEN MISSED BUT ARE REQUIRED**
   - Extract 3-8 key points from the narrative
   - Format as one item per line (each line is a bullet point, separated by newlines)
   - Each line should be a complete sentence or phrase
   - Example format (note the newlines between items):
     "Key benefit 1 from narrative\nKey benefit 2 from narrative\nKey benefit 3 from narrative"
   - If the narrative doesn't have enough list items, extract and adapt related points from the narrative
   - **DO NOT SKIP LIST SLOTS - THEY ARE MANDATORY AND WILL CAUSE ERRORS IF MISSING**
   - Look for ALL slots with "list" in their ID or type - include every single one
8. **For content blocks:** Extract the main content from the narrative that fits that section. This can be multiple sentences or paragraphs combined. **DO NOT skip content blocks - they are required**
9. Maintain consistency - all fields should align with the same narrative thread.
10. **ALWAYS obey the character limit** for every slot. No exceptions.
11. Use the exact slot IDs as JSON keys (e.g. "money_back_guarantee" NOT "Money Back Guarantee"). **DO NOT use human-readable labels or skip any slots.**
12. **CRITICAL: DO NOT include HTML tags in your response.** Return ONLY plain text content. The template already has the HTML structure (H1, H2, P, UL, OL tags). You should provide just the text that goes inside those tags. For example, return "My Heading Text" NOT "<h1>My Heading Text</h1>".
13. **VERIFICATION STEP: Before submitting, count the number of keys in your JSON. It MUST equal ${validFields.length}. If it doesn't, you're missing slots - go back and add them.**

**Response Format:**
You MUST respond with ONLY valid JSON in this exact format (no markdown, no code blocks, no explanations). **INCLUDE ALL ${validFields.length} SLOTS - DO NOT SKIP ANY:**

{
${validFields.length > 0 ? `  "${validFields[0].slotId}": "extracted content for first field"` : ''}${validFields.length > 1 ? `,\n  "${validFields[1].slotId}": "extracted content for second field"` : ''}${validFields.length > 2 ? `,\n  "${validFields[2].slotId}": "extracted content for third field"` : ''}${validFields.length > 3 ? `,\n  ...` : ''}${validFields.length > 1 ? `,\n  "${validFields[validFields.length - 1].slotId}": "extracted content for last field"` : ''}
}

**CRITICAL: VERIFICATION CHECKLIST:**
1. Every slot value is UNDER its character limit - check [STRICT LIMIT] for each slot.
2. Count the keys in your JSON response - you must have exactly ${validFields.length} keys
3. Every slot ID from the list above must appear as a key in your JSON
4. For list slots, provide multiple lines (one item per line)
5. For content blocks, provide substantial content (multiple sentences)
6. If a slot seems difficult, extract the most relevant content from the narrative - DO NOT skip it

**REQUIRED SLOT IDs - YOU MUST INCLUDE ALL OF THESE IN YOUR JSON RESPONSE:**
${validFields.map((f, i) => {
  const isList = f.slotType === 'list';
  const isContentBlock = f.label.toLowerCase().includes('content block');
  const marker = (isList || isContentBlock) ? ' ⚠️ MANDATORY - DO NOT SKIP' : '';
  return `${i + 1}. "${f.slotId}" (${f.slotType}): ${f.label}${marker}`;
}).join('\n')}

**COMPLETE LIST OF REQUIRED SLOT IDs (copy these exactly into your JSON):**
${validFields.map(f => `"${f.slotId}"`).join(', ')}

**REMINDER: Your JSON response must contain ALL ${validFields.length} of these slot IDs as keys. Missing any slot will cause an error.**

**BEFORE SUBMITTING YOUR RESPONSE - MANDATORY CHECKLIST:**
1. Every slot value MUST be under its character limit - exceeding limits crashes the system.
2. Count the keys in your JSON response - you MUST have exactly ${validFields.length} keys (no more, no less)
3. Verify that EVERY slot ID from the "REQUIRED SLOT IDs" list above appears as a key in your JSON
4. **SPECIAL ATTENTION: Check for ALL list slots** - look for any slot ID containing "list" (like "section_list_0", "section_list_1", etc.) and ensure they are ALL included
5. **SPECIAL ATTENTION: Check for ALL content blocks** - ensure all content block slots are included
6. If you find ANY missing slots, STOP and add them before submitting - DO NOT submit incomplete responses
7. Double-check that your JSON is valid and can be parsed - test it mentally or write it out to verify
8. **FINAL CHECK: Your JSON must have ${validFields.length} keys. Count them now before submitting.**

Each value should be a string containing ONLY plain text content (no HTML tags). 
- Headlines = ONE LINE
- Paragraphs = FULL PARAGRAPHS  
- Lists = ONE ITEM PER LINE (each line is a bullet point, use newlines to separate items)
- Content Blocks = MULTIPLE SENTENCES OR PARAGRAPHS
- NO HTML TAGS

**FINAL REMINDER:** (1) Return JSON with exactly ${validFields.length} keys. (2) **ALWAYS obey the character limit for every slot**—headline, paragraph, list, or otherwise. Count characters. Stay under the limit.`;

  return prompt;
}

/**
 * Build the prompt for regenerating a single slot with core narrative context.
 * Used when user clicks "Regenerate" on a specific field.
 */
export function buildRegenerateSlotPrompt(request: RegenerateSlotRequest): string {
  const { slotId, slotType, coreNarrative, userConfig, regenerationInstructions, maxLength } = request;

  // CRITICAL: Character limit determines the type. Check limit FIRST.
  const effectiveType = maxLength != null && maxLength < 80 ? 'headline' : slotType;
  const isHeadline = effectiveType === 'headline' || effectiveType === 'subheadline';

  const slotTypeInstructions: Record<string, string> = {
    headline: 'Write ONE short headline. Max a few words. NO periods.',
    subheadline: 'Write ONE short subheadline. NO periods.',
    paragraph: 'Write a paragraph that summarizes or extracts key points from the core narrative.',
    bullet: 'Write a concise bullet point.',
    list: 'Extract and format key points as a list (one item per line).',
    cta: 'Write a short call-to-action (2-5 words). NO periods.',
    'meta-description': 'Write a meta description for SEO.',
    quote: 'Extract or create a compelling quote from the narrative.',
  };

  const typeInstruction = isHeadline
    ? `This is a HEADLINE. Write ONE short line (max ${maxLength ?? 80} characters). NO periods.`
    : (slotTypeInstructions[effectiveType] || 'Extract relevant content from the core narrative.');

  // Build tone instruction
  const toneInstructions: Record<string, string> = {
    serious: 'more serious and authoritative',
    educational: 'more educational and informative',
    cheerful: 'more cheerful and upbeat',
    direct: 'more direct and straightforward',
  };
  const toneModifier = toneInstructions[userConfig.tone.toLowerCase()] || `more ${userConfig.tone}`;

  const lengthConstraint = maxLength != null
    ? `\n\n**STEP 1 - CHECK THE LIMIT: MAX ${maxLength} CHARACTERS.** Stay under it. Exceeding breaks the layout.`
    : '';

  const customInstructions = regenerationInstructions
    ? `\n\n**Specific Regeneration Instructions:**\n${regenerationInstructions}`
    : `\n\n**Tone Adjustment:** Make it ${toneModifier} while maintaining consistency with the core narrative.`;

  const prompt = `You are a professional copywriter. Your task is to regenerate a specific page element using the Core Narrative as context.

**Core Narrative (Source of Truth):**
${coreNarrative}

**Slot to Regenerate:**
- Slot ID: ${slotId}
${maxLength != null ? `- **MAX ${maxLength} CHARACTERS** — Check this FIRST. Limit < 80 = headline. Limit >= 80 = paragraph.` : ''}
- Type: ${effectiveType}
- Task: ${typeInstruction}
${lengthConstraint}${customInstructions}

**Target Audience:** ${userConfig.ageRange || 'all'} ${userConfig.gender || 'all'}${userConfig.country ? ` in ${userConfig.country}` : ''}${userConfig.targetStates && userConfig.targetStates.length > 0 ? ` (psychographic profile: ${userConfig.targetStates.join(', ')})` : ''}
**Main Keyword:** ${userConfig.mainKeyword}
${userConfig.targetStates && userConfig.targetStates.length > 0 
  ? `\n**Psychographic Targeting:** Adapt tone, metaphors, and priorities to match the cultural mindset and values typical of ${userConfig.targetStates.length === 1 ? userConfig.targetStates[0] : userConfig.targetStates.join(', ')}. DO NOT mention city names, landmarks, or state names. Focus on values and mindset, not geography.`
  : ''}

**CRITICAL REQUIREMENTS:**
1. The content MUST be derived from and consistent with the Core Narrative above.
2. Do NOT introduce new information that contradicts or is not supported by the Core Narrative.
3. Maintain the same overall messaging as the Core Narrative.
4. Ensure the content naturally incorporates the keyword "${userConfig.mainKeyword}" if relevant.
5. The regenerated content should be compelling and appropriate for the target audience.
6. **CRITICAL: DO NOT include HTML tags in your response.** Return ONLY plain text content. The template already has the HTML structure. You should provide just the text that goes inside the HTML tags. For example, return "My Heading Text" NOT "<h1>My Heading Text</h1>".

Respond with ONLY the regenerated content as plain text. No explanations, no markdown formatting, no HTML tags, just the content text.`;

  return prompt;
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
