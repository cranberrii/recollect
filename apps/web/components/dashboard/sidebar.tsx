'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  FolderOpen,
  Tag,
  Archive,
  HelpCircle,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import { useCollectionFilter } from './collection-filter-context';

interface SidebarProps {
  activeSection?: string;
  categories?: Array<{ name: string; count: number }>;
  totalBookmarks?: number;
  collapsed?: boolean;
  onToggle?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href?: string;
  isActive?: boolean;
  count?: number;
  badge?: string;
  onClick?: () => void;
  collapsed?: boolean;
  onMobileClose?: () => void;
}

function NavItem({ icon, label, href = '#', isActive, count, badge, onClick, collapsed, onMobileClose }: NavItemProps) {
  const handleClick = () => {
    onClick?.();
    onMobileClose?.();
  };

  const content = (
    <div
      title={collapsed ? label : undefined}
      className={`
        group flex items-center gap-3 rounded-xl cursor-pointer
        transition-all duration-200 ease-out
        ${collapsed ? 'justify-center px-0 py-2.5 w-10 mx-auto' : 'px-3 py-2.5'}
        ${isActive
          ? 'bg-surface-900 dark:bg-white text-white dark:text-surface-900 shadow-soft'
          : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-surface-100'
        }
      `}
      onClick={handleClick}
    >
      <span className={`flex-shrink-0 ${isActive ? 'text-accent-400 dark:text-accent-500' : 'text-surface-400 group-hover:text-surface-600 dark:group-hover:text-surface-300'}`}>
        {icon}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 text-sm font-medium">{label}</span>
          {count !== undefined && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              isActive ? 'bg-white/10 dark:bg-surface-900/20 text-white/80 dark:text-surface-900/80' : 'bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400'
            }`}>
              {count}
            </span>
          )}
          {badge && (
            <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-accent-100 dark:bg-accent-900/50 text-accent-700 dark:text-accent-400">
              {badge}
            </span>
          )}
        </>
      )}
    </div>
  );

  if (href !== '#') {
    return <Link href={href} onClick={onMobileClose}>{content}</Link>;
  }
  return content;
}

export function Sidebar({
  activeSection = 'all',
  categories = [],
  totalBookmarks = 0,
  collapsed = false,
  onToggle,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const [collectionsExpanded, setCollectionsExpanded] = useState(true);
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const { activeFilters, toggleFilter } = useCollectionFilter();

  return (
    <aside className={`
      flex flex-col h-screen
      bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800
      overflow-hidden
      transition-transform duration-300 ease-in-out
      fixed inset-y-0 left-0 z-50 w-72
      ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      md:relative md:inset-auto md:z-auto md:translate-x-0
      md:transition-all md:duration-300
      ${collapsed ? 'md:w-16' : 'md:w-64'}
    `}>
      {/* Logo Section */}
      <div className={`border-b border-surface-100 dark:border-surface-800 flex items-center ${collapsed ? 'p-3 justify-center' : 'p-5 justify-between'}`}>
        {collapsed ? (
          <Link href="/dashboard" className="flex items-center justify-center" onClick={onMobileClose}>
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-soft">
              <span className="font-display font-bold text-lg text-white">R</span>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
            </div>
          </Link>
        ) : (
          <>
            <Link href="/dashboard" className="flex items-center gap-3 group" onClick={onMobileClose}>
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-soft group-hover:shadow-glow transition-shadow duration-300">
                <span className="font-display font-bold text-lg text-white">R</span>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
              </div>
              <div>
                <h1 className="font-display text-lg font-semibold text-surface-900 dark:text-surface-100 tracking-tight">
                  Recollect
                </h1>
                <p className="text-2xs text-surface-400 -mt-0.5">AI-powered bookmarks</p>
              </div>
            </Link>
            {/* X close button — mobile only */}
            <button
              onClick={onMobileClose}
              aria-label="Close menu"
              className="md:hidden p-1.5 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-1 px-3">
        {/* Main Navigation */}
        <div className="space-y-0.5">
          <NavItem
            icon={<Bookmark className="w-[18px] h-[18px]" />}
            label="All Bookmarks"
            isActive={activeSection === 'all'}
            count={!collapsed ? totalBookmarks : undefined}
            collapsed={collapsed}
            onMobileClose={onMobileClose}
          />
        </div>

        {/* Divider */}
        <div className="my-4 h-px bg-surface-100 dark:bg-surface-800" />

        {/* Collections Section */}
        <div>
          {!collapsed && (
            <button
              onClick={() => setCollectionsExpanded(!collectionsExpanded)}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-surface-400 uppercase tracking-wider hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
            >
              <span>Collections</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${collectionsExpanded ? '' : '-rotate-90'}`} />
            </button>
          )}
          {(collectionsExpanded || collapsed) && (
            <div className="mt-1 space-y-0.5 animate-fade-in">
              <NavItem
                icon={<FolderOpen className="w-[18px] h-[18px]" />}
                label="Reading"
                isActive={activeFilters.has('reading')}
                onClick={() => toggleFilter('reading')}
                collapsed={collapsed}
                onMobileClose={onMobileClose}
              />
              <NavItem
                icon={<Archive className="w-[18px] h-[18px]" />}
                label="Archive"
                isActive={activeFilters.has('archive')}
                onClick={() => toggleFilter('archive')}
                collapsed={collapsed}
                onMobileClose={onMobileClose}
              />
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="my-4 h-px bg-surface-100 dark:bg-surface-800" />

        {/* Categories Section */}
        {!collapsed && (
          <div>
            <button
              onClick={() => setCategoriesExpanded(!categoriesExpanded)}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-surface-400 uppercase tracking-wider hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
            >
              <span>Categories</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${categoriesExpanded ? '' : '-rotate-90'}`} />
            </button>
            {categoriesExpanded && (
              <div className="mt-1 space-y-0.5 animate-fade-in">
                {categories.length > 0 ? (
                  <>
                    {(showAllCategories ? categories : categories.slice(0, 6)).map((category) => (
                      <NavItem
                        key={category.name}
                        icon={<Tag className="w-[18px] h-[18px]" />}
                        label={category.name}
                        count={category.count}
                        onMobileClose={onMobileClose}
                      />
                    ))}
                    {categories.length > 6 && (
                      <button
                        onClick={() => setShowAllCategories(!showAllCategories)}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
                      >
                        <span className="text-xs">
                          {showAllCategories ? 'Show less' : `View all categories (${categories.length})`}
                        </span>
                      </button>
                    )}
                  </>
                ) : (
                  <p className="px-3 py-2 text-xs text-surface-400">No categories yet</p>
                )}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-surface-100 dark:border-surface-800 space-y-0.5">
        <NavItem
          icon={<HelpCircle className="w-[18px] h-[18px]" />}
          label="Help & Support"
          collapsed={collapsed}
          onMobileClose={onMobileClose}
        />
        {/* Desktop collapse toggle — hidden on mobile */}
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`
            hidden md:flex items-center gap-3 rounded-xl w-full cursor-pointer
            transition-all duration-200 ease-out
            text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-600 dark:hover:text-surface-300
            ${collapsed ? 'justify-center px-0 py-2.5 w-10 mx-auto' : 'px-3 py-2.5'}
          `}
        >
          {collapsed
            ? <PanelLeftOpen className="w-[18px] h-[18px]" />
            : <PanelLeftClose className="w-[18px] h-[18px]" />
          }
          {!collapsed && <span className="text-sm font-medium">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
