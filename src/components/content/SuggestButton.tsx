'use client';

import { useState } from 'react';

interface SuggestButtonProps {
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
  onSuggestionSelect: (suggestion: string) => void;
  disabled?: boolean;
}

export function SuggestButton({
  currentContent,
  fieldType,
  fieldLabel,
  context,
  onSuggestionSelect,
  disabled = false,
}: SuggestButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuggest = async () => {
    if (!currentContent.trim()) {
      setError('Please enter some content first');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuggestions([]);
    setImprovements([]);

    try {
      const response = await fetch('/api/suggest-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentContent,
          fieldType,
          fieldLabel,
          context,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate suggestions');
      }

      setSuggestions(data.suggestions || []);
      setImprovements(data.improvements || []);
      setShowSuggestions(true);
    } catch (err: any) {
      setError(err.message || 'Failed to generate suggestions');
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    onSuggestionSelect(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleSuggest}
        disabled={disabled || isLoading || !currentContent.trim()}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
          disabled || isLoading || !currentContent.trim()
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
        }`}
        title="Get AI-powered content suggestions"
      >
        {isLoading ? (
          <>
            <span className="animate-spin">⏳</span>
            <span>Suggesting...</span>
          </>
        ) : (
          <>
            <span>💡</span>
            <span>Suggest</span>
          </>
        )}
      </button>

      {error && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 z-50 max-w-xs">
          {error}
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-gray-200 bg-purple-50">
            <h4 className="text-sm font-semibold text-purple-900">💡 AI Suggestions</h4>
            <p className="text-xs text-purple-700 mt-1">
              {fieldLabel || fieldType} - Click to use a suggestion
            </p>
          </div>
          <div className="p-2">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="mb-2 p-3 border border-gray-200 rounded-md hover:border-purple-300 hover:bg-purple-50 transition-colors cursor-pointer"
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-gray-800 flex-1">{suggestion}</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectSuggestion(suggestion);
                    }}
                    className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                  >
                    Use
                  </button>
                </div>
                {improvements[index] && (
                  <p className="text-xs text-gray-600 mt-2 italic">
                    ✨ {improvements[index]}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={() => setShowSuggestions(false)}
              className="text-xs text-gray-600 hover:text-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

