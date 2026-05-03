import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard';
import { QuickStats } from '@/components/dashboard/quick-stats';
import { BookmarkSection } from '@/components/bookmarks/bookmark-section';
import { HealthCheck } from '@/components/dashboard/health-check';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch bookmarks with categories (limited list for display)
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

  // Date boundaries for stats
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Total count (not capped by display limit)
  const { count: totalBookmarks } = await supabase
    .from('bookmarks')
    .select('*', { count: 'exact', head: true });

  const { count: recentlyAdded } = await supabase
    .from('bookmarks')
    .select('*', { count: 'exact', head: true })
    .gt('created_at', oneDayAgo.toISOString());

  const { count: thisWeekAdded } = await supabase
    .from('bookmarks')
    .select('*', { count: 'exact', head: true })
    .gt('created_at', oneWeekAgo.toISOString());

  const { count: lastWeekAdded } = await supabase
    .from('bookmarks')
    .select('*', { count: 'exact', head: true })
    .gt('created_at', twoWeeksAgo.toISOString())
    .lte('created_at', oneWeekAgo.toISOString());

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

  const stats = {
    totalBookmarks: totalBookmarks ?? 0,
    categoriesCount: categories.length,
    recentlyAdded: recentlyAdded ?? 0,
    thisWeekAdded: thisWeekAdded ?? 0,
    lastWeekAdded: lastWeekAdded ?? 0,
    topCategory: categories[0]?.name,
  };

  return (
    <DashboardLayout
      user={user}
      categories={categories}
      totalBookmarks={totalBookmarks ?? 0}
      activeSection="all"
      isAnonymous={user.is_anonymous === true}
    >
      <HealthCheck />
      <QuickStats stats={stats} />
      <BookmarkSection initialBookmarks={bookmarks || []} />
    </DashboardLayout>
  );
}
