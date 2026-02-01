import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { BookmarkSection } from '@/components/bookmarks/bookmark-section';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch bookmarks with categories
  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select(`
      *,
      bookmark_categories (
        categories (
          name
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Bookmark Orchestrator</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <BookmarkSection initialBookmarks={bookmarks || []} />
      </main>
    </div>
  );
}
