'use client';

import { ReactNode, useState, useEffect } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { GuestBanner } from './guest-banner';
import { CollectionFilterProvider } from './collection-filter-context';

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
  isAnonymous?: boolean;
}

export function DashboardLayout({
  children,
  user,
  categories = [],
  totalBookmarks = 0,
  activeSection = 'all',
  isAnonymous = false,
}: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileSidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileSidebarOpen]);

  return (
    <CollectionFilterProvider>
      <div className="flex h-screen overflow-hidden bg-surface-50 dark:bg-surface-950 transition-colors duration-300">
        {/* Mobile backdrop */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <Sidebar
          activeSection={activeSection}
          categories={categories}
          totalBookmarks={totalBookmarks}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <Header user={user} onMenuOpen={() => setMobileSidebarOpen(true)} isAnonymous={isAnonymous} />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
              {isAnonymous && <GuestBanner />}
              {children}
            </div>
          </main>
        </div>
      </div>
    </CollectionFilterProvider>
  );
}
