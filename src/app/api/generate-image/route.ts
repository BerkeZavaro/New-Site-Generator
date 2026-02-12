import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@/lib/generator/googleAI';

interface GenerateImageRequest {
  prompt: string;
  productName?: string;
  mainKeyword?: string;
  slotLabel?: string;
  dimensions?: { width?: number; height?: number };
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateImageRequest = await request.json();
    const { prompt, dimensions } = body;

    if (!prompt) {
      return Response.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return Response.json(
        {
          error: 'GOOGLE_AI_API_KEY environment variable is not set',
          hint: 'Please add it to your .env.local file'
        },
        { status: 500 }
      );
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);

      // FIX: PURE PROMPT LOGIC
      // We rely 100% on the user's input. We do NOT inject Product Name or Keywords
      // to avoid forcing specific objects (like supplement bottles) into the scene.
      let enhancedPrompt = prompt;

      // Add only technical style guidance
      enhancedPrompt += `. High quality, professional photography, photorealistic.`;

      if (dimensions?.width && dimensions?.height) {
        enhancedPrompt += ` Aspect ratio: ${dimensions.width}:${dimensions.height}.`;
      }

      const modelNames = [
        'gemini-2.5-flash-image',
        'gemini-2.5-flash-image-exp',
        'gemini-2.0-flash-exp',
        'gemini-1.5-flash-latest',
      ];

      let model;
      let lastError: unknown = null;

      for (const modelName of modelNames) {
        try {
          console.log(`🔄 Trying image generation model: ${modelName}`);
          model = genAI.getGenerativeModel({ model: modelName });

          const result = await model.generateContent({
            contents: [{
              role: 'user',
              parts: [{
                text: enhancedPrompt
              }]
            }]
          });

          const response = await result.response;
          const candidates = response.candidates || [];

          for (const candidate of candidates) {
            const parts = candidate.content?.parts || [];
            for (const part of parts) {
              if (part.inlineData) {
                const imageData = part.inlineData.data;
                const mimeType = part.inlineData.mimeType || 'image/png';
                const dataUrl = `data:${mimeType};base64,${imageData}`;

                console.log(`✅ Image generated successfully using model: ${modelName}`);
                return Response.json({
                  success: true,
                  imageData: dataUrl,
                  model: modelName,
                  mimeType: mimeType
                });
              }

              if (part.text) {
                const text = part.text.trim();
                if (text.startsWith('data:image/')) {
                  console.log(`✅ Image generated successfully using model: ${modelName}`);
                  return Response.json({
                    success: true,
                    imageData: text,
                    model: modelName
                  });
                }
                if (text.startsWith('http://') || text.startsWith('https://')) {
                  console.log(`✅ Image URL generated successfully using model: ${modelName}`);
                  return Response.json({
                    success: true,
                    imageUrl: text,
                    model: modelName
                  });
                }
              }
            }
          }

          const responseText = response.text();
          if (responseText) {
            const base64Match = responseText.match(/data:image\/[^;]+;base64,[^\s"']+/);
            if (base64Match) {
              console.log(`✅ Image found in response text using model: ${modelName}`);
              return Response.json({
                success: true,
                imageData: base64Match[0],
                model: modelName
              });
            }
          }

          console.log(`⚠️ Model ${modelName} responded but no image found`);
          lastError = new Error(`Model ${modelName} did not return image data`);
          continue;

        } catch (error: unknown) {
          const err = error as { message?: string };
          console.log(`❌ Model ${modelName} failed:`, err.message);
          lastError = error;
          if (err.message?.includes('404') ||
              err.message?.includes('not found') ||
              err.message?.includes('is not found')) {
            continue;
          }
          throw error;
        }
      }

      return Response.json({
        error: 'Image generation not available with current models',
        details: `Tried models: ${modelNames.join(', ')}. ${lastError instanceof Error ? lastError.message : 'No models returned image data'}`,
        suggestion: 'Nano Banana (gemini-2.5-flash-image) may not be available in your region'
      }, { status: 503 });

    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Image generation error:', error);
      if (err.message?.includes('404') || err.message?.includes('not found')) {
        return Response.json({
          error: 'Image generation model not available',
          details: 'Gemini image generation may require Vertex AI setup'
        }, { status: 503 });
      }
      throw error;
    }

  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Image generation error:', error);
    return Response.json(
      { error: 'Image generation failed', details: err?.message },
      { status: 500 }
    );
  }
}
