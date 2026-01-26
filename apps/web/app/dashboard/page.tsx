import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { AddBookmarkForm } from '@/components/bookmarks/add-bookmark-form';
import { DeleteBookmarkButton } from '@/components/bookmarks/delete-bookmark-button';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // const { data: { session } } = await supabase.auth.getSession()
  // console.log(session.access_token)

  if (!user) {
    redirect('/login');
  }

  // Fetch bookmarks
  const { data: bookmarks } = await supabase
    .from('bookmarks')
    .select('*')
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
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Your Bookmarks</h2>
          <p className="text-gray-600 mb-4">
            {bookmarks?.length || 0} bookmarks saved
          </p>
          <AddBookmarkForm />
        </div>

        {bookmarks && bookmarks.length > 0 ? (
          <div className="grid gap-4">
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="bg-white p-4 rounded-lg border hover:shadow-md transition"
              >
                <div className="flex justify-between items-start gap-2">
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {bookmark.title || bookmark.url}
                  </a>
                  <DeleteBookmarkButton bookmarkId={bookmark.id} />
                </div>
                {bookmark.description && (
                  <p className="text-gray-600 text-sm mt-1">
                    {bookmark.description}
                  </p>
                )}
                {bookmark.tags && bookmark.tags.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {bookmark.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border">
            <p className="text-gray-600">No bookmarks yet.</p>
            <p className="text-sm text-gray-500 mt-2">
              Install the browser extension to start saving bookmarks.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
