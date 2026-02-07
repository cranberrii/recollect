'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/theme-context';
import {
  ChevronDown,
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
  CreditCard,
  ExternalLink,
} from 'lucide-react';

interface HeaderProps {
  user: {
    email?: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  };
}

export function Header({ user }: HeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();
  const { theme, toggleTheme } = useTheme();

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="h-16 bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl border-b border-surface-200 dark:border-surface-800 sticky top-0 z-40 transition-colors duration-300">
      <div className="h-full px-6 flex items-center justify-end gap-4">
        {/* Profile Dropdown */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={`
              flex items-center gap-3 p-1.5 pr-3 rounded-xl
              transition-all duration-200 ease-out
              ${isProfileOpen ? 'bg-surface-100 dark:bg-surface-800' : 'hover:bg-surface-100 dark:hover:bg-surface-800'}
            `}
          >
            {/* Avatar */}
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt={displayName}
                className="w-8 h-8 rounded-lg object-cover ring-2 ring-surface-200 dark:ring-surface-700"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white text-xs font-semibold shadow-soft">
                {initials}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-surface-900 dark:text-surface-100 leading-tight">
                {displayName}
              </p>
              <p className="text-xs text-surface-400 leading-tight">
                Free Plan
              </p>
            </div>
            <ChevronDown className={`w-4 h-4 text-surface-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-surface-900 rounded-xl shadow-lifted border border-surface-200 dark:border-surface-800 py-2 animate-scale-in origin-top-right">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-surface-100 dark:border-surface-800">
                <div className="flex items-center gap-3">
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt={displayName}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white text-sm font-semibold">
                      {initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-surface-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <DropdownItem icon={<User className="w-4 h-4" />} label="Profile" />
                <DropdownItem icon={<Settings className="w-4 h-4" />} label="Settings" />
                <DropdownItem icon={<CreditCard className="w-4 h-4" />} label="Billing" badge="Upgrade" />
                <DropdownItem
                  icon={theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  label={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  onClick={toggleTheme}
                  isToggle
                  isToggled={theme === 'dark'}
                />
              </div>

              <div className="border-t border-surface-100 dark:border-surface-800 py-2">
                <DropdownItem
                  icon={<ExternalLink className="w-4 h-4" />}
                  label="Install Extension"
                  external
                />
              </div>

              <div className="border-t border-surface-100 dark:border-surface-800 py-2">
                <DropdownItem
                  icon={<LogOut className="w-4 h-4" />}
                  label="Sign Out"
                  onClick={handleSignOut}
                  danger
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

interface DropdownItemProps {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  isToggle?: boolean;
  isToggled?: boolean;
  external?: boolean;
  danger?: boolean;
  onClick?: () => void;
}

function DropdownItem({ icon, label, badge, isToggle, isToggled, external, danger, onClick }: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-2 text-sm
        transition-colors duration-150
        ${danger
          ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50'
          : 'text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800'
        }
      `}
    >
      <span className={danger ? 'text-red-500' : 'text-surface-400'}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-accent-100 dark:bg-accent-900/50 text-accent-700 dark:text-accent-400">
          {badge}
        </span>
      )}
      {isToggle && (
        <div className={`w-8 h-5 rounded-full transition-colors duration-200 ${isToggled ? 'bg-accent-500' : 'bg-surface-200 dark:bg-surface-700'}`}>
          <div className={`w-4 h-4 mt-0.5 rounded-full bg-white shadow transition-transform duration-200 ${isToggled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
        </div>
      )}
      {external && (
        <ExternalLink className="w-3.5 h-3.5 text-surface-400" />
      )}
    </button>
  );
}
