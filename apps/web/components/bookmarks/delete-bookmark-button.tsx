'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Trash2, Check } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface DeleteBookmarkButtonProps {
  bookmarkId: string;
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return createPortal(
    <div
      className={`
        fixed bottom-6 right-6 flex items-center gap-3
        bg-surface-900 dark:bg-white text-white dark:text-surface-900 px-4 py-3 rounded-xl shadow-lifted
        transition-all duration-300 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      <div className="p-1 rounded-full bg-sage-500">
        <Check className="w-3.5 h-3.5 text-white" />
      </div>
      <span className="text-sm font-medium">{message}</span>
    </div>,
    document.body
  );
}

export function DeleteBookmarkButton({ bookmarkId }: DeleteBookmarkButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.error('Not authenticated');
        return;
      }

      const response = await fetch(`${API_URL}/api/v1/bookmarks/${bookmarkId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        console.error('Failed to delete bookmark');
        return;
      }

      setShowToast(true);
      router.refresh();
    } catch (err) {
      console.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="flex items-center gap-1.5 animate-fade-in">
        <button
          onClick={handleDelete}
          disabled={isLoading}
          className="px-2.5 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Delete'
          )}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          className="px-2.5 py-1.5 text-xs font-medium text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-surface-100 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="p-2 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all duration-200"
        title="Delete bookmark"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      {showToast && (
        <Toast message="Bookmark deleted" onClose={() => setShowToast(false)} />
      )}
    </>
  );
}
