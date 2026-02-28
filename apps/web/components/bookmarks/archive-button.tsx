'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Archive } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ArchiveButtonProps {
  bookmarkId: string;
  initialIsArchived: boolean;
}

export function ArchiveButton({ bookmarkId, initialIsArchived }: ArchiveButtonProps) {
  const [isArchived, setIsArchived] = useState(initialIsArchived);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    const newValue = !isArchived;
    setIsArchived(newValue); // Optimistic update

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setIsArchived(!newValue); // Revert
        return;
      }

      const response = await fetch(`${API_URL}/api/v1/bookmarks/${bookmarkId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_archived: newValue }),
      });

      if (!response.ok) {
        setIsArchived(!newValue); // Revert on failure
      }
    } catch {
      setIsArchived(!newValue); // Revert on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      title={isArchived ? 'Unarchive' : 'Archive'}
      className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
        isArchived
          ? 'text-surface-600 dark:text-surface-300 bg-surface-100 dark:bg-surface-800'
          : 'text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 md:opacity-0 md:group-hover:opacity-100'
      }`}
    >
      <Archive className="w-4 h-4" />
    </button>
  );
}
