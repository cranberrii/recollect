'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, X, Sparkles, Zap, Type } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type SearchMode = 'hybrid' | 'semantic' | 'keyword';

interface SearchResult {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  summary: string | null;
  favicon_url: string | null;
  created_at: string | null;
  semantic_score: number;
  category_score: number;
  rrf_score: number;
  matched_categories: string[];
}

interface SearchBarProps {
  onResults: (results: SearchResult[] | null) => void;
  onSearching: (isSearching: boolean) => void;
}

const searchModes: { value: SearchMode; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'hybrid', label: 'Hybrid', icon: <Zap className="w-3.5 h-3.5" />, description: 'Best of both' },
  { value: 'semantic', label: 'Semantic', icon: <Sparkles className="w-3.5 h-3.5" />, description: 'AI-powered' },
  { value: 'keyword', label: 'Keyword', icon: <Type className="w-3.5 h-3.5" />, description: 'Exact match' },
];

export function SearchBar({ onResults, onSearching }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('hybrid');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      onResults(null);
      onSearching(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    onSearching(true);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('You must be logged in to search');
        return;
      }

      const response = await fetch(`${API_URL}/api/v1/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          query: searchQuery,
          mode,
          limit: 20,
          threshold: 0.3,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.detail || 'Search failed');
        return;
      }

      const results: SearchResult[] = await response.json();
      onResults(results);
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [mode, onResults, onSearching]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search]);

  const handleClear = () => {
    setQuery('');
    onResults(null);
    onSearching(false);
  };

  return (
    <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-4 shadow-soft transition-colors duration-300">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div
          className={`
            relative flex-1 flex items-center gap-3 px-4 py-3 rounded-xl
            border transition-all duration-200 ease-out
            ${isFocused
              ? 'border-accent-400 ring-2 ring-accent-100 dark:ring-accent-900/50 bg-white dark:bg-surface-800'
              : 'border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 hover:border-surface-300 dark:hover:border-surface-600'
            }
          `}
        >
          <Search className={`w-5 h-5 flex-shrink-0 transition-colors ${isFocused ? 'text-accent-500' : 'text-surface-400'}`} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Search your bookmarks with AI..."
            className="flex-1 bg-transparent text-surface-900 dark:text-surface-100 placeholder:text-surface-400 outline-none text-sm"
          />
          {isLoading && (
            <div className="flex-shrink-0">
              <div className="w-5 h-5 border-2 border-accent-200 dark:border-accent-800 border-t-accent-500 rounded-full animate-spin" />
            </div>
          )}
          {query && !isLoading && (
            <button
              onClick={handleClear}
              className="flex-shrink-0 p-1 rounded-md text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mode Selector - Segmented Control */}
        <div className="flex bg-surface-100 dark:bg-surface-800 rounded-xl p-1 gap-1">
          {searchModes.map((searchMode) => (
            <button
              key={searchMode.value}
              onClick={() => setMode(searchMode.value)}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                transition-all duration-200
                ${mode === searchMode.value
                  ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 shadow-soft'
                  : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300'
                }
              `}
              title={searchMode.description}
            >
              <span className={mode === searchMode.value ? 'text-accent-500' : ''}>
                {searchMode.icon}
              </span>
              <span className="hidden sm:inline">{searchMode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          {error}
        </div>
      )}
    </div>
  );
}
