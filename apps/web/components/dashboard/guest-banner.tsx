'use client';

import Link from 'next/link';
import { UserPlus, X } from 'lucide-react';
import { useState } from 'react';

export function GuestBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
      <UserPlus className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
      <p className="flex-1 text-sm text-amber-800 dark:text-amber-300">
        You&apos;re trying Recollect as a guest. Your bookmarks are temporary —{' '}
        <Link
          href="/login"
          className="font-semibold underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200 transition-colors"
        >
          create a free account
        </Link>{' '}
        to keep them permanently.
      </p>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="p-1 rounded-lg text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
