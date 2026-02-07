'use client';

import { ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';

interface DashboardLayoutProps {
  children: ReactNode;
  user: {
    email?: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  };
  categories?: Array<{ name: string; count: number }>;
  totalBookmarks?: number;
  activeSection?: string;
}

export function DashboardLayout({
  children,
  user,
  categories = [],
  totalBookmarks = 0,
  activeSection = 'all',
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-50 dark:bg-surface-950 transition-colors duration-300">
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        categories={categories}
        totalBookmarks={totalBookmarks}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header user={user} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
