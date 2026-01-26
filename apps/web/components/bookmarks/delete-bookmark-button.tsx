'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

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
      className={`fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {message}
    </div>,
    document.body
  );
}

export function DeleteBookmarkButton({ bookmarkId }: DeleteBookmarkButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
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
    }
  };

  return (
    <>
      <button
        onClick={handleDelete}
        disabled={isLoading}
        className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
        title="Delete bookmark"
      >
        <Trash2 size={18} />
      </button>
      {showToast && (
        <Toast message="Bookmark Deleted!" onClose={() => setShowToast(false)} />
      )}
    </>
  );
}
