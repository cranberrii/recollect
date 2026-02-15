'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BookOpen } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ReadingListButtonProps {
  bookmarkId: string;
  initialIsFavorite: boolean;
}

export function ReadingListButton({ bookmarkId, initialIsFavorite }: ReadingListButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    const newValue = !isFavorite;
    setIsFavorite(newValue); // Optimistic update

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setIsFavorite(!newValue); // Revert
        return;
      }

      const response = await fetch(`${API_URL}/api/v1/bookmarks/${bookmarkId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_favorite: newValue }),
      });

      if (!response.ok) {
        setIsFavorite(!newValue); // Revert on failure
      }
    } catch {
      setIsFavorite(!newValue); // Revert on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      title={isFavorite ? 'Remove from Reading' : 'Add to Reading'}
      className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
        isFavorite
          ? 'text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/30'
          : 'text-surface-400 hover:text-accent-600 dark:hover:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-900/30 opacity-0 group-hover:opacity-100'
      }`}
    >
      <BookOpen className="w-4 h-4" />
    </button>
  );
}
