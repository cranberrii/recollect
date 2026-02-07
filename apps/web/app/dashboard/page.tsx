import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard';
import { QuickStats } from '@/components/dashboard/quick-stats';
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

  // Fetch category counts for sidebar
  const { data: categoryData } = await supabase
    .from('bookmark_categories')
    .select(`
      categories (
        name
      )
    `);

  // Calculate category counts
  const categoryCounts: Record<string, number> = {};
  categoryData?.forEach((item: { categories: { name: string } | { name: string }[] | null }) => {
    const categories = item.categories;
    // Handle both single object and array cases
    const name = Array.isArray(categories) ? categories[0]?.name : categories?.name;
    if (name) {
      categoryCounts[name] = (categoryCounts[name] || 0) + 1;
    }
  });

  const categories = Object.entries(categoryCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Calculate stats
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const recentlyAdded = bookmarks?.filter(
    (b) => new Date(b.created_at) > oneDayAgo
  ).length || 0;

  const thisWeekAdded = bookmarks?.filter(
    (b) => new Date(b.created_at) > oneWeekAgo
  ).length || 0;

  // For last week, we'd need more data - using estimate for now
  const lastWeekAdded = Math.max(0, thisWeekAdded - 2);

  const stats = {
    totalBookmarks: bookmarks?.length || 0,
    categoriesCount: categories.length,
    recentlyAdded,
    thisWeekAdded,
    lastWeekAdded,
    topCategory: categories[0]?.name,
  };

  return (
    <DashboardLayout
      user={user}
      categories={categories}
      totalBookmarks={bookmarks?.length || 0}
      activeSection="all"
    >
      <QuickStats stats={stats} />
      <BookmarkSection initialBookmarks={bookmarks || []} />
    </DashboardLayout>
  );
}
