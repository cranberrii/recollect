'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Plus, Link2, Check, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function AddBookmarkForm() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setMessage({ type: 'error', text: 'Please enter a URL' });
      return;
    }

    // Basic URL validation
    let validUrl = url.trim();
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }

    try {
      new URL(validUrl);
    } catch {
      setMessage({ type: 'error', text: 'Please enter a valid URL' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setMessage({ type: 'error', text: 'You must be logged in to add bookmarks' });
        return;
      }

      const response = await fetch(`${API_URL}/api/v1/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ url: validUrl }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 409 || error.detail?.includes('duplicate')) {
          setMessage({ type: 'error', text: 'This bookmark already exists' });
        } else {
          setMessage({ type: 'error', text: error.detail || 'Failed to add bookmark' });
        }
        return;
      }

      setMessage({ type: 'success', text: 'Bookmark added successfully!' });
      setUrl('');
      router.refresh();

      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-4 shadow-soft transition-colors duration-300">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        {/* URL Input */}
        <div
          className={`
            relative flex-1 flex items-center gap-3 px-4 py-3 rounded-xl
            border transition-all duration-200 ease-out
            ${isFocused
              ? 'border-accent-400 ring-2 ring-accent-100 dark:ring-accent-900/50 bg-white dark:bg-surface-800'
              : 'border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 hover:border-surface-300 dark:hover:border-surface-600'
            }
            ${isLoading ? 'opacity-60' : ''}
          `}
        >
          <Link2 className={`w-5 h-5 flex-shrink-0 transition-colors ${isFocused ? 'text-accent-500' : 'text-surface-400'}`} />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Paste a URL to save..."
            className="flex-1 bg-transparent text-surface-900 dark:text-surface-100 placeholder:text-surface-400 outline-none text-sm"
            disabled={isLoading}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`
            flex items-center justify-center gap-2 px-5 py-3 rounded-xl
            font-medium text-sm transition-all duration-200
            ${isLoading
              ? 'bg-surface-200 dark:bg-surface-800 text-surface-400 cursor-not-allowed'
              : 'bg-surface-900 dark:bg-white text-white dark:text-surface-900 hover:bg-surface-800 dark:hover:bg-surface-100 shadow-soft hover:shadow-lifted active:scale-[0.98]'
            }
          `}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-surface-300 dark:border-surface-600 border-t-surface-500 dark:border-t-surface-400 rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>Add Bookmark</span>
            </>
          )}
        </button>
      </form>

      {/* Status Message */}
      {message && (
        <div
          className={`
            mt-3 flex items-center gap-2 text-sm animate-fade-in
            ${message.type === 'success' ? 'text-sage-700 dark:text-sage-400' : 'text-red-600 dark:text-red-400'}
          `}
        >
          {message.type === 'success' ? (
            <div className="p-0.5 rounded-full bg-sage-100 dark:bg-sage-900/50">
              <Check className="w-3.5 h-3.5" />
            </div>
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {message.text}
        </div>
      )}
    </div>
  );
}
