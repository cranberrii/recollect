import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Bookmark, Search, Sparkles, ArrowRight } from 'lucide-react';
import { TryItOutButton } from '@/components/landing/try-it-out-button';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen bg-surface-50 dark:bg-surface-950 transition-colors duration-300">
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-16">
        {/* Logo */}
        <div className="opacity-0 animate-slide-up">
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 shadow-glow flex items-center justify-center mb-8">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
            <Bookmark className="w-7 h-7 text-white relative z-10" />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center max-w-lg opacity-0 animate-slide-up stagger-1">
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-surface-900 dark:text-surface-100 tracking-tight mb-4">
            Recollect
          </h1>
          <p className="text-lg text-surface-500 dark:text-surface-400 leading-relaxed">
            AI-powered bookmark manager with semantic search, smart categorization, and instant summaries.
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8 opacity-0 animate-slide-up stagger-2">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-soft">
            <Search className="w-4 h-4 text-accent-500" />
            <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Semantic Search</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-soft">
            <Sparkles className="w-4 h-4 text-accent-500" />
            <span className="text-sm font-medium text-surface-700 dark:text-surface-300">AI Summaries</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-soft">
            <Bookmark className="w-4 h-4 text-accent-500" />
            <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Smart Categories</span>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-3 opacity-0 animate-slide-up stagger-3">
          <Link
            href="/login"
            className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-surface-900 dark:bg-white text-white dark:text-surface-900 font-semibold text-sm shadow-soft hover:shadow-lifted hover:-translate-y-0.5 transition-all duration-300"
          >
            Get Started
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
          <TryItOutButton />
        </div>
      </div>
    </main>
  );
}
