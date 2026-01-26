'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function AddBookmarkForm() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
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
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg border">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter or paste a URL..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
        >
          {isLoading ? 'Adding...' : 'Add Bookmark'}
        </button>
      </form>
      {message && (
        <p
          className={`mt-3 text-sm ${
            message.type === 'success' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
