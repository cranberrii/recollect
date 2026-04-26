'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function TryItOutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleTryItOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      router.push('/dashboard');
      router.refresh();
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleTryItOut}
      disabled={loading}
      className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-surface-300 dark:border-surface-700 text-surface-700 dark:text-surface-300 font-semibold text-sm hover:bg-surface-100 dark:hover:bg-surface-900 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0"
    >
      {loading ? 'Starting...' : 'Try it out'}
    </button>
  );
}
