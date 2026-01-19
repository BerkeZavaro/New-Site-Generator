import { NextRequest } from 'next/server';
import { GoogleGeminiProvider } from '@/lib/generator/ContentGenerator';

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;

if (!GOOGLE_AI_API_KEY) {
  throw new Error('GOOGLE_AI_API_KEY is not set in environment variables');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      currentContent,
      fieldType,
      fieldLabel,
      context,
    }: {
      currentContent: string;
      fieldType: 'headline' | 'paragraph' | 'list' | 'other';
      fieldLabel?: string;
      context: {
        productName: string;
        mainKeyword: string;
        tone: string;
        ageRange?: string;
        gender?: string;
        targetStates?: string[];
      };
    } = body;

    if (!currentContent || !fieldType || !context) {
      return Response.json(
        { error: 'Missing required fields: currentContent, fieldType, context' },
        { status: 400 }
      );
    }

    const aiProvider = new GoogleGeminiProvider();

    // Build context-aware prompt for suggestions
    const audienceContext = context.ageRange || context.gender
      ? `Target audience: ${[context.ageRange, context.gender].filter(Boolean).join(', ')}`
      : '';

    const locationContext = context.targetStates && context.targetStates.length > 0
      ? `Target location: ${context.targetStates.join(', ')}`
      : '';

    const prompt = `You are an expert copywriter specializing in supplement marketing funnels. 

Your task: Provide 3 alternative versions of the following content that are more engaging, persuasive, and optimized for the given context.

**Current Content:**
${currentContent}

**Field Type:** ${fieldType}
${fieldLabel ? `**Field Label:** ${fieldLabel}` : ''}

**Context:**
- Product: ${context.productName}
- Main Keyword: ${context.mainKeyword}
- Tone: ${context.tone}
${audienceContext ? `- ${audienceContext}` : ''}
${locationContext ? `- ${locationContext}` : ''}

**Requirements:**
1. Maintain the core message and key information
2. Make it more engaging and persuasive
3. Optimize for the keyword "${context.mainKeyword}" naturally
4. Match the "${context.tone}" tone
5. Keep it appropriate for the target audience
${fieldType === 'headline' ? '6. Make it attention-grabbing and compelling (aim for 60-80 characters)' : ''}
${fieldType === 'paragraph' ? '6. Ensure good flow and readability' : ''}
${fieldType === 'list' ? '6. Make each item clear and impactful' : ''}

**Output Format (JSON only, no markdown):**
{
  "suggestions": [
    "First alternative version here",
    "Second alternative version here",
    "Third alternative version here"
  ],
  "improvements": [
    "What makes suggestion 1 better",
    "What makes suggestion 2 better",
    "What makes suggestion 3 better"
  ],
  "reasoning": "Brief explanation of the improvements made"
}

Provide ONLY valid JSON, no additional text or markdown formatting.`;

    const response = await aiProvider.generateText(prompt, {
      modelName: 'gemini-3-pro-preview',
      apiKey: GOOGLE_AI_API_KEY!,
      temperature: 0.7,
      maxTokens: 1000,
    });

    // Parse JSON response
    let suggestionsData;
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestionsData = JSON.parse(jsonMatch[0]);
      } else {
        suggestionsData = JSON.parse(response);
      }
    } catch (parseError) {
      // If parsing fails, create fallback suggestions
      console.error('Failed to parse suggestions response:', parseError);
      suggestionsData = {
        suggestions: [
          currentContent + ' (Enhanced)',
          currentContent + ' (Optimized)',
          currentContent + ' (Improved)',
        ],
        improvements: [
          'More engaging language',
          'Better keyword placement',
          'Stronger call-to-action',
        ],
        reasoning: 'AI response parsing failed, showing fallback suggestions',
      };
    }

    // Ensure we have valid suggestions
    if (!suggestionsData.suggestions || !Array.isArray(suggestionsData.suggestions)) {
      suggestionsData.suggestions = [currentContent];
    }

    return Response.json({
      success: true,
      suggestions: suggestionsData.suggestions.slice(0, 3), // Max 3 suggestions
      improvements: suggestionsData.improvements || [],
      reasoning: suggestionsData.reasoning || '',
    });
  } catch (error: any) {
    console.error('Content suggestion error:', error);
    return Response.json(
      {
        success: false,
        error: error.message || 'Failed to generate suggestions',
      },
      { status: 500 }
    );
  }
}


