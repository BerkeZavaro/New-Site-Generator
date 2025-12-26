import { NextRequest } from 'next/server';
import { GoogleGeminiProvider } from '@/lib/generator/ContentGenerator';

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;

if (!GOOGLE_AI_API_KEY) {
  throw new Error('GOOGLE_AI_API_KEY is not set in environment variables');
}

interface ValidationCheck {
  field: string;
  fieldLabel: string;
  status: 'pass' | 'warning' | 'error';
  score: number; // 0-100
  issues: string[];
  suggestions: string[];
}

interface ValidationResult {
  overallScore: number;
  checks: ValidationCheck[];
  summary: {
    passed: number;
    warnings: number;
    errors: number;
  };
}

// Library-based checks (no AI needed)
function checkRequiredFields(content: Record<string, any>, requiredFields: string[]): ValidationCheck[] {
  const checks: ValidationCheck[] = [];
  
  for (const field of requiredFields) {
    const value = content[field];
    const isEmpty = !value || (typeof value === 'string' && value.trim() === '');
    
    checks.push({
      field,
      fieldLabel: field,
      status: isEmpty ? 'error' : 'pass',
      score: isEmpty ? 0 : 100,
      issues: isEmpty ? [`${field} is required but empty`] : [],
      suggestions: isEmpty ? [`Please fill in ${field}`] : [],
    });
  }
  
  return checks;
}

function checkContentLength(content: Record<string, any>, field: string, minLength: number, maxLength: number): ValidationCheck {
  const value = content[field] || '';
  const length = typeof value === 'string' ? value.length : 0;
  
  let status: 'pass' | 'warning' | 'error' = 'pass';
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  if (length < minLength) {
    status = 'error';
    issues.push(`Content is too short (${length} chars, minimum ${minLength})`);
    suggestions.push(`Add more content to reach at least ${minLength} characters`);
  } else if (length > maxLength) {
    status = 'warning';
    issues.push(`Content exceeds recommended length (${length} chars, recommended max ${maxLength})`);
    suggestions.push(`Consider shortening to ${maxLength} characters or less`);
  }
  
  const score = length < minLength ? 0 : length > maxLength ? 70 : 100;
  
  return {
    field,
    fieldLabel: field,
    status,
    score,
    issues,
    suggestions,
  };
}

function calculateReadabilityScore(text: string): number {
  // Simple readability calculation (Flesch Reading Ease approximation)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const syllables = words.reduce((count, word) => {
    return count + Math.max(1, word.toLowerCase().match(/[aeiouy]+/g)?.length || 1);
  }, 0);
  
  if (sentences.length === 0 || words.length === 0) return 0;
  
  const avgSentenceLength = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;
  
  // Flesch Reading Ease formula (simplified)
  const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
  
  // Normalize to 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      content,
      templateId,
      context,
    }: {
      content: Record<string, any>;
      templateId: string;
      context: {
        productName: string;
        mainKeyword: string;
        tone: string;
      };
    } = body;

    if (!content || !context) {
      return Response.json(
        { error: 'Missing required fields: content, context' },
        { status: 400 }
      );
    }

    const checks: ValidationCheck[] = [];
    
    // 1. Required fields check
    const requiredFields = ['productName', 'mainKeyword'];
    checks.push(...checkRequiredFields(content, requiredFields));
    
    // 2. Content length checks (basic)
    if (content.pageHeadline) {
      checks.push(checkContentLength(content, 'pageHeadline', 20, 100));
    }
    if (content.introParagraph) {
      checks.push(checkContentLength(content, 'introParagraph', 50, 500));
    }
    
    // 3. Readability checks (library-based)
    const textFields = ['introParagraph', 'mainBenefits', 'bottomLineParagraph'];
    for (const field of textFields) {
      if (content[field] && typeof content[field] === 'string') {
        const readability = calculateReadabilityScore(content[field]);
        const status = readability < 30 ? 'warning' : readability < 50 ? 'warning' : 'pass';
        
        checks.push({
          field,
          fieldLabel: field,
          status,
          score: readability,
          issues: readability < 50 ? [`Readability score is ${readability}/100 (aim for 50+)`] : [],
          suggestions: readability < 50 ? ['Use shorter sentences and simpler words'] : [],
        });
      }
    }
    
    // 4. AI-powered quality checks (if we have enough content)
    if (content.pageHeadline && content.introParagraph && GOOGLE_AI_API_KEY) {
      try {
        const aiProvider = new GoogleGeminiProvider(GOOGLE_AI_API_KEY);
        
        const prompt = `You are a content quality validator for supplement marketing funnels.

Analyze the following content and provide quality scores and feedback.

**Content to Validate:**
- Headline: ${content.pageHeadline || 'N/A'}
- Intro: ${content.introParagraph?.substring(0, 200) || 'N/A'}
- Main Benefits: ${content.mainBenefits?.substring(0, 200) || 'N/A'}

**Context:**
- Product: ${context.productName}
- Keyword: ${context.mainKeyword}
- Tone: ${context.tone}

**Validation Criteria:**
1. Relevance to keyword (0-100)
2. Tone consistency (0-100)
3. Persuasiveness (0-100)
4. Clarity and coherence (0-100)
5. SEO optimization (0-100)

**Output Format (JSON only):**
{
  "qualityScores": {
    "relevance": 85,
    "tone": 90,
    "persuasiveness": 80,
    "clarity": 75,
    "seo": 70
  },
  "overallScore": 80,
  "issues": [
    "Issue 1 description",
    "Issue 2 description"
  ],
  "suggestions": [
    "Suggestion 1",
    "Suggestion 2"
  ]
}

Provide ONLY valid JSON, no markdown.`;

        const aiResponse = await aiProvider.generateText(prompt, {
          model: 'gemini-3-pro-preview',
          temperature: 0.3,
          maxTokens: 500,
        });
        
        // Parse AI response
        try {
          const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const aiData = JSON.parse(jsonMatch[0]);
            
            // Add AI quality check
            checks.push({
              field: 'overall_quality',
              fieldLabel: 'Overall Content Quality',
              status: aiData.overallScore >= 80 ? 'pass' : aiData.overallScore >= 60 ? 'warning' : 'error',
              score: aiData.overallScore || 0,
              issues: aiData.issues || [],
              suggestions: aiData.suggestions || [],
            });
          }
        } catch (parseError) {
          console.error('Failed to parse AI validation response:', parseError);
        }
      } catch (aiError) {
        console.error('AI validation error:', aiError);
        // Continue without AI check if it fails
      }
    }
    
    // Calculate overall score
    const scores = checks.map(c => c.score).filter(s => s > 0);
    const overallScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    
    // Summary
    const summary = {
      passed: checks.filter(c => c.status === 'pass').length,
      warnings: checks.filter(c => c.status === 'warning').length,
      errors: checks.filter(c => c.status === 'error').length,
    };
    
    const result: ValidationResult = {
      overallScore,
      checks,
      summary,
    };
    
    return Response.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Content validation error:', error);
    return Response.json(
      {
        success: false,
        error: error.message || 'Failed to validate content',
      },
      { status: 500 }
    );
  }
}


