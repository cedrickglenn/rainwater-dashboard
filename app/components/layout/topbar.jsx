/**
 * Topbar Component
 * Top navigation bar with mobile menu toggle, search, and user actions
 */

import { useState } from 'react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import {
  Menu,
  Bell,
  Sun,
  Moon,
  Search,
  User,
  RefreshCw,
} from 'lucide-react';

/**
 * Topbar Component
 * @param {Object} props - Component props
 * @param {function} props.onMenuClick - Handler for mobile menu toggle
 * @param {string} props.theme - Current theme ('light', 'dark', 'system')
 * @param {function} props.onThemeToggle - Theme toggle handler
 * @param {number} props.alertCount - Number of unread alerts
 * @param {string} props.className - Additional CSS classes
 */
export function Topbar({
  onMenuClick,
  theme = 'light',
  onThemeToggle,
  alertCount = 0,
  className,
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Handle data refresh
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
    // In real app, this would trigger data refetch
  };

  const isDark = theme === 'dark';

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 px-4 sm:px-6',
        className
      )}
    >
      {/* Left section */}
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search (hidden on small screens) */}
        <div className="hidden sm:flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="w-40 lg:w-64 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Refresh button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="hidden sm:flex"
          aria-label="Refresh data"
        >
          <RefreshCw
            className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
          />
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onThemeToggle}
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {alertCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center"
            >
              {alertCount > 9 ? '9+' : alertCount}
            </Badge>
          )}
        </Button>

        {/* User menu */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="User menu"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            <User className="h-4 w-4" />
          </div>
        </Button>
      </div>
    </header>
  );
}
