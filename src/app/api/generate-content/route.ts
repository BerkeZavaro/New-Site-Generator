import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GenerateContentRequest {
  productName: string;
  mainKeyword: string;
  ageRange: string;
  gender: string;
  country?: string;
  state?: string;
  tone: string;
}

interface GenerateContentResponse {
  headline: string;
  intro: string;
  benefits: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateContentRequest = await request.json();
    const { productName, mainKeyword, ageRange, gender, country, state, tone } = body;

    // Validate required fields
    if (!productName || !mainKeyword) {
      return Response.json(
        { error: 'productName and mainKeyword are required' },
        { status: 400 }
      );
    }

    // Build audience context
    const audienceParts: string[] = [];
    if (ageRange && ageRange !== 'all') {
      audienceParts.push(`age range ${ageRange}`);
    }
    if (gender && gender !== 'all') {
      audienceParts.push(gender);
    }
    if (country) {
      audienceParts.push(country);
    }
    if (state) {
      audienceParts.push(state);
    }
    const audienceContext = audienceParts.length > 0
      ? `Target audience: ${audienceParts.join(', ')}. `
      : '';

    // Build tone instruction
    const toneInstructions: { [key: string]: string } = {
      serious: 'Use a serious, professional, and authoritative tone.',
      educational: 'Use an educational, informative, and helpful tone.',
      cheerful: 'Use a cheerful, upbeat, and positive tone.',
      direct: 'Use a direct, straightforward, and no-nonsense tone.',
    };
    const toneInstruction = toneInstructions[tone.toLowerCase()] || 'Use a professional tone.';

    const systemPrompt = `You are a professional copywriter specializing in supplement and health product marketing. Generate compelling, accurate content for product landing pages.`;

    const userPrompt = `Create marketing content for a creatine supplement product page.

Product Name: ${productName}
Main Keyword/Topic: ${mainKeyword}
${audienceContext}${toneInstruction}

Requirements:
1. Write a short, strong page headline (under 80 characters) that naturally incorporates the main keyword.
2. Write an intro paragraph (3-5 sentences) that introduces the product and addresses the main keyword/topic.
3. Provide a list of 5-8 key benefits of this creatine supplement. Each benefit should be a complete sentence or phrase (no bullet points in the text itself).

Make sure the content:
- Naturally incorporates the main keyword "${mainKeyword}" and related phrases
- Addresses the target audience appropriately
- Uses the requested tone: ${tone}
- Is accurate and compelling
- Avoids medical claims that require FDA approval

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "headline": "Your headline here",
  "intro": "Your intro paragraph here",
  "benefits": ["Benefit 1", "Benefit 2", "Benefit 3", "Benefit 4", "Benefit 5"]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return Response.json(
        { error: 'No content generated' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let parsed: GenerateContentResponse;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      return Response.json(
        { error: 'Failed to parse generated content' },
        { status: 500 }
      );
    }

    // Validate the response structure
    if (!parsed.headline || !parsed.intro || !Array.isArray(parsed.benefits)) {
      return Response.json(
        { error: 'Invalid response format from AI' },
        { status: 500 }
      );
    }

    return Response.json({
      headline: parsed.headline,
      intro: parsed.intro,
      benefits: parsed.benefits,
    });
  } catch (error) {
    console.error('Content generation error:', error);
    return Response.json(
      { error: 'Content generation failed' },
      { status: 500 }
    );
  }
}

