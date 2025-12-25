'use client';

import { useState, useEffect } from 'react';

interface ValidationCheck {
  field: string;
  fieldLabel: string;
  status: 'pass' | 'warning' | 'error';
  score: number;
  issues: string[];
  suggestions: string[];
}

interface ValidationPanelProps {
  content: Record<string, any>;
  context: {
    productName: string;
    mainKeyword: string;
    tone: string;
  };
  templateId: string;
}

export function ValidationPanel({ content, context, templateId }: ValidationPanelProps) {
  const [validation, setValidation] = useState<{
    overallScore: number;
    checks: ValidationCheck[];
    summary: { passed: number; warnings: number; errors: number };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Debounce validation
    const timeoutId = setTimeout(() => {
      validateContent();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [content, context, templateId]);

  const validateContent = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/validate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          templateId,
          context,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setValidation(data);
      }
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!validation) {
    return null;
  }

  const getOverallColor = () => {
    if (validation.overallScore >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (validation.overallScore >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getOverallIcon = () => {
    if (validation.overallScore >= 80) return '✅';
    if (validation.overallScore >= 60) return '⚠️';
    return '❌';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm font-semibold text-gray-900 hover:text-gray-700"
          >
            Content Quality Check
          </button>
          {isLoading && (
            <span className="text-xs text-gray-500">Validating...</span>
          )}
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded border ${getOverallColor()}`}>
          <span className="text-lg">{getOverallIcon()}</span>
          <span className="font-bold">{validation.overallScore}/100</span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
        <span className="flex items-center gap-1">
          <span className="text-green-600">✓</span>
          {validation.summary.passed} passed
        </span>
        <span className="flex items-center gap-1">
          <span className="text-yellow-600">⚠</span>
          {validation.summary.warnings} warnings
        </span>
        <span className="flex items-center gap-1">
          <span className="text-red-600">✗</span>
          {validation.summary.errors} errors
        </span>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
          {validation.checks.map((check, index) => (
            <div
              key={index}
              className={`p-3 rounded border ${
                check.status === 'error'
                  ? 'bg-red-50 border-red-200'
                  : check.status === 'warning'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-green-50 border-green-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900">{check.fieldLabel}</span>
                <span className="text-xs font-semibold">{check.score}/100</span>
              </div>
              {check.issues.length > 0 && (
                <div className="mt-2 space-y-1">
                  {check.issues.map((issue, i) => (
                    <div key={i} className="text-xs text-gray-700">
                      • {issue}
                    </div>
                  ))}
                </div>
              )}
              {check.suggestions.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <div className="text-xs font-medium text-gray-700 mb-1">Suggestions:</div>
                  {check.suggestions.map((suggestion, i) => (
                    <div key={i} className="text-xs text-gray-600">
                      💡 {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-3 text-xs text-gray-600 hover:text-gray-800"
      >
        {isExpanded ? '▼ Collapse' : '▶ Expand details'}
      </button>
    </div>
  );
}

