'use client';

import {
  Bookmark,
  Tag,
  Clock,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface QuickStatsProps {
  stats: {
    totalBookmarks: number;
    categoriesCount: number;
    recentlyAdded: number;
    thisWeekAdded: number;
    lastWeekAdded: number;
    topCategory?: string;
  };
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  accentColor: 'amber' | 'sage' | 'ink' | 'surface';
  delay?: number;
}

function StatCard({
  icon,
  label,
  value,
  subValue,
  trend,
  trendValue,
  accentColor,
  delay = 0,
}: StatCardProps) {
  const accentStyles = {
    amber: {
      bg: 'bg-accent-50 dark:bg-accent-900/30',
      icon: 'text-accent-600 dark:text-accent-400',
      ring: 'ring-accent-200 dark:ring-accent-800',
    },
    sage: {
      bg: 'bg-sage-50 dark:bg-sage-900/30',
      icon: 'text-sage-600 dark:text-sage-400',
      ring: 'ring-sage-200 dark:ring-sage-800',
    },
    ink: {
      bg: 'bg-ink-50 dark:bg-ink-900/30',
      icon: 'text-ink-600 dark:text-ink-400',
      ring: 'ring-ink-200 dark:ring-ink-800',
    },
    surface: {
      bg: 'bg-surface-100 dark:bg-surface-800',
      icon: 'text-surface-600 dark:text-surface-400',
      ring: 'ring-surface-200 dark:ring-surface-700',
    },
  };

  const styles = accentStyles[accentColor];

  return (
    <div
      className="group relative bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 hover-lift opacity-0 animate-slide-up transition-colors duration-300"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-surface-50/0 to-surface-100/0 group-hover:from-surface-50/50 group-hover:to-surface-100/30 dark:group-hover:from-surface-800/50 dark:group-hover:to-surface-800/30 transition-all duration-300" />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-2.5 rounded-xl ${styles.bg} ring-1 ${styles.ring}`}>
            <span className={styles.icon}>{icon}</span>
          </div>
          {trend && trendValue && (
            <div className={`flex items-center gap-1 text-xs font-medium ${
              trend === 'up' ? 'text-sage-600 dark:text-sage-400' : trend === 'down' ? 'text-red-500' : 'text-surface-400'
            }`}>
              {trend === 'up' ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : trend === 'down' ? (
                <ArrowDownRight className="w-3.5 h-3.5" />
              ) : null}
              <span>{trendValue}</span>
            </div>
          )}
        </div>

        <div>
          <p className="text-sm text-surface-500 dark:text-surface-400 mb-1">{label}</p>
          <p className="text-2xl font-display font-semibold text-surface-900 dark:text-surface-100 tracking-tight">
            {value}
          </p>
          {subValue && (
            <p className="text-xs text-surface-400 mt-1">{subValue}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function QuickStats({ stats }: QuickStatsProps) {
  const weeklyChange = stats.thisWeekAdded - stats.lastWeekAdded;
  const weeklyTrend = weeklyChange > 0 ? 'up' : weeklyChange < 0 ? 'down' : 'neutral';
  const weeklyPercentage = stats.lastWeekAdded > 0
    ? Math.round((weeklyChange / stats.lastWeekAdded) * 100)
    : 0;

  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-accent-100 dark:bg-accent-900/50">
            <TrendingUp className="w-4 h-4 text-accent-600 dark:text-accent-400" />
          </div>
          <div>
            <h2 className="text-lg font-display font-semibold text-surface-900 dark:text-surface-100">Quick Overview</h2>
            <p className="text-sm text-surface-400">Your bookmark activity at a glance</p>
          </div>
        </div>
        <button className="text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors">
          View Analytics
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Bookmark className="w-5 h-5" />}
          label="Total Bookmarks"
          value={stats.totalBookmarks}
          subValue="Across all collections"
          accentColor="amber"
          delay={0}
        />
        <StatCard
          icon={<Tag className="w-5 h-5" />}
          label="Categories"
          value={stats.categoriesCount}
          subValue={stats.topCategory ? `Top: ${stats.topCategory}` : 'AI-organized'}
          accentColor="sage"
          delay={50}
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="This Week"
          value={stats.thisWeekAdded}
          trend={weeklyTrend}
          trendValue={weeklyPercentage !== 0 ? `${Math.abs(weeklyPercentage)}%` : undefined}
          subValue="New bookmarks added"
          accentColor="ink"
          delay={100}
        />
        <StatCard
          icon={<Sparkles className="w-5 h-5" />}
          label="Recently Added"
          value={stats.recentlyAdded}
          subValue="In the last 24 hours"
          accentColor="surface"
          delay={150}
        />
      </div>
    </div>
  );
}
