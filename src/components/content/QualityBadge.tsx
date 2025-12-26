'use client';

import { useState, useEffect } from 'react';

interface QualityBadgeProps {
  field: string;
  fieldLabel: string;
  content: string;
  context: {
    productName: string;
    mainKeyword: string;
    tone: string;
  };
  minLength?: number;
  maxLength?: number;
  required?: boolean;
}

interface ValidationCheck {
  field: string;
  fieldLabel: string;
  status: 'pass' | 'warning' | 'error';
  score: number;
  issues: string[];
  suggestions: string[];
}

export function QualityBadge({
  field,
  fieldLabel,
  content,
  context,
  minLength,
  maxLength,
  required = false,
}: QualityBadgeProps) {
  const [score, setScore] = useState<number | null>(null);
  const [status, setStatus] = useState<'pass' | 'warning' | 'error'>('pass');
  const [issues, setIssues] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Quick validation (no API call)
    const quickValidate = () => {
      const newIssues: string[] = [];
      let newStatus: 'pass' | 'warning' | 'error' = 'pass';
      let newScore = 100;

      // Required field check
      if (required && (!content || content.trim() === '')) {
        newIssues.push('This field is required');
        newStatus = 'error';
        newScore = 0;
      }

      // Length checks
      if (content) {
        const length = content.length;
        if (minLength && length < minLength) {
          newIssues.push(`Too short (${length} chars, min ${minLength})`);
          newStatus = 'error';
          newScore = Math.min(newScore, 30);
        } else if (maxLength && length > maxLength) {
          newIssues.push(`Too long (${length} chars, max ${maxLength})`);
          newStatus = 'warning';
          newScore = Math.min(newScore, 70);
        }
      }

      // Keyword check (basic)
      if (content && context.mainKeyword && !content.toLowerCase().includes(context.mainKeyword.toLowerCase())) {
        newIssues.push(`Keyword "${context.mainKeyword}" not found`);
        newStatus = 'warning';
        newScore = Math.min(newScore, 80);
      }

      setScore(newScore);
      setStatus(newStatus);
      setIssues(newIssues);
    };

    // Debounce validation
    const timeoutId = setTimeout(quickValidate, 500);
    return () => clearTimeout(timeoutId);
  }, [content, minLength, maxLength, required, context.mainKeyword]);

  const getStatusColor = () => {
    if (status === 'error') return 'bg-red-100 text-red-700 border-red-300';
    if (status === 'warning') return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-green-100 text-green-700 border-green-300';
  };

  const getStatusIcon = () => {
    if (status === 'error') return '❌';
    if (status === 'warning') return '⚠️';
    return '✅';
  };

  if (score === null) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowDetails(!showDetails)}
        className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded border ${getStatusColor()} transition-colors hover:opacity-80`}
        title={`Quality: ${score}/100 - Click for details`}
      >
        <span>{getStatusIcon()}</span>
        <span className="font-semibold">{score}/100</span>
        {issues.length > 0 && (
          <span className="ml-1">({issues.length})</span>
        )}
      </button>

      {showDetails && issues.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3">
          <h5 className="text-xs font-semibold text-gray-900 mb-2">
            Quality Check: {fieldLabel}
          </h5>
          <div className="space-y-1">
            {issues.map((issue, index) => (
              <div key={index} className="text-xs text-gray-700">
                • {issue}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowDetails(false)}
            className="mt-2 text-xs text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}


