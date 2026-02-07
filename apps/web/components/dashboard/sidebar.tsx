'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  Search,
  FolderOpen,
  Tag,
  Clock,
  Star,
  Archive,
  Settings,
  HelpCircle,
  ChevronDown,
  Plus,
} from 'lucide-react';

interface SidebarProps {
  activeSection?: string;
  categories?: Array<{ name: string; count: number }>;
  totalBookmarks?: number;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href?: string;
  isActive?: boolean;
  count?: number;
  badge?: string;
  onClick?: () => void;
}

function NavItem({ icon, label, href = '#', isActive, count, badge, onClick }: NavItemProps) {
  const content = (
    <div
      className={`
        group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer
        transition-all duration-200 ease-out
        ${isActive
          ? 'bg-surface-900 dark:bg-white text-white dark:text-surface-900 shadow-soft'
          : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-surface-100'
        }
      `}
      onClick={onClick}
    >
      <span className={`flex-shrink-0 ${isActive ? 'text-accent-400 dark:text-accent-500' : 'text-surface-400 group-hover:text-surface-600 dark:group-hover:text-surface-300'}`}>
        {icon}
      </span>
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
    </div>
  );

  if (href !== '#') {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export function Sidebar({ activeSection = 'all', categories = [], totalBookmarks = 0 }: SidebarProps) {
  const [collectionsExpanded, setCollectionsExpanded] = useState(true);
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);

  return (
    <aside className="w-64 h-screen bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 flex flex-col overflow-hidden transition-colors duration-300">
      {/* Logo Section */}
      <div className="p-5 border-b border-surface-100 dark:border-surface-800">
        <Link href="/dashboard" className="flex items-center gap-3 group">
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
      </div>

      {/* Quick Actions */}
      <div className="p-3">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-900 dark:bg-white hover:bg-surface-800 dark:hover:bg-surface-100 text-white dark:text-surface-900 rounded-xl text-sm font-medium transition-colors duration-200 shadow-soft hover:shadow-lifted">
          <Plus className="w-4 h-4" />
          <span>Add Bookmark</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {/* Main Navigation */}
        <div className="space-y-0.5">
          <NavItem
            icon={<Bookmark className="w-[18px] h-[18px]" />}
            label="All Bookmarks"
            isActive={activeSection === 'all'}
            count={totalBookmarks}
          />
          <NavItem
            icon={<Search className="w-[18px] h-[18px]" />}
            label="Smart Search"
            isActive={activeSection === 'search'}
            badge="AI"
          />
          <NavItem
            icon={<Clock className="w-[18px] h-[18px]" />}
            label="Recently Added"
            isActive={activeSection === 'recent'}
          />
          <NavItem
            icon={<Star className="w-[18px] h-[18px]" />}
            label="Favorites"
            isActive={activeSection === 'favorites'}
          />
        </div>

        {/* Divider */}
        <div className="my-4 h-px bg-surface-100 dark:bg-surface-800" />

        {/* Collections Section */}
        <div>
          <button
            onClick={() => setCollectionsExpanded(!collectionsExpanded)}
            className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-surface-400 uppercase tracking-wider hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
          >
            <span>Collections</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${collectionsExpanded ? '' : '-rotate-90'}`} />
          </button>
          {collectionsExpanded && (
            <div className="mt-1 space-y-0.5 animate-fade-in">
              <NavItem
                icon={<FolderOpen className="w-[18px] h-[18px]" />}
                label="Work"
                isActive={activeSection === 'work'}
                count={12}
              />
              <NavItem
                icon={<FolderOpen className="w-[18px] h-[18px]" />}
                label="Personal"
                isActive={activeSection === 'personal'}
                count={8}
              />
              <NavItem
                icon={<FolderOpen className="w-[18px] h-[18px]" />}
                label="Reading List"
                isActive={activeSection === 'reading'}
                count={24}
              />
              <button className="flex items-center gap-3 px-3 py-2 text-sm text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors">
                <Plus className="w-4 h-4" />
                <span>New Collection</span>
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="my-4 h-px bg-surface-100 dark:bg-surface-800" />

        {/* Categories Section */}
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
                categories.slice(0, 6).map((category) => (
                  <NavItem
                    key={category.name}
                    icon={<Tag className="w-[18px] h-[18px]" />}
                    label={category.name}
                    count={category.count}
                  />
                ))
              ) : (
                <>
                  <NavItem icon={<Tag className="w-[18px] h-[18px]" />} label="Technology" count={18} />
                  <NavItem icon={<Tag className="w-[18px] h-[18px]" />} label="Design" count={12} />
                  <NavItem icon={<Tag className="w-[18px] h-[18px]" />} label="Development" count={24} />
                  <NavItem icon={<Tag className="w-[18px] h-[18px]" />} label="Articles" count={9} />
                </>
              )}
              <button className="flex items-center gap-3 px-3 py-2 text-sm text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors">
                <span className="text-xs">View all categories</span>
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="my-4 h-px bg-surface-100 dark:bg-surface-800" />

        {/* Secondary Navigation */}
        <div className="space-y-0.5">
          <NavItem
            icon={<Archive className="w-[18px] h-[18px]" />}
            label="Archive"
            isActive={activeSection === 'archive'}
          />
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-surface-100 dark:border-surface-800 space-y-0.5">
        <NavItem
          icon={<Settings className="w-[18px] h-[18px]" />}
          label="Settings"
          href="/settings"
        />
        <NavItem
          icon={<HelpCircle className="w-[18px] h-[18px]" />}
          label="Help & Support"
        />
      </div>
    </aside>
  );
}
