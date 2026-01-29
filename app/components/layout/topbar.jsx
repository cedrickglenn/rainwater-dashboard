/**
 * Topbar Component
 * Top navigation bar with mobile menu toggle, search, and user actions
 * 
 * Mobile-first design principles:
 * - 44px+ minimum touch targets for all interactive elements
 * - Simplified layout on mobile (fewer visible controls)
 * - Icons sized for touch (h-5/h-6 instead of h-4)
 * - Adequate spacing between touch targets
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

  // Base classes for touch-friendly buttons (44px minimum touch target)
  const touchButtonClasses = 'min-h-[44px] min-w-[44px] h-11 w-11';

  return (
    <header
      className={cn(
        // Taller header on mobile for better touch accessibility
        'sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between',
        'border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60',
        'px-2 sm:px-4 lg:px-6',
        className
      )}
    >
      {/* Left section */}
      <div className="flex items-center gap-1 sm:gap-3">
        {/* Mobile menu toggle - larger touch target */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className={cn(touchButtonClasses, 'lg:hidden')}
          aria-label="Toggle menu"
        >
          <Menu className="h-6 w-6" />
        </Button>

        {/* App title on mobile (since sidebar is hidden) */}
        <span className="font-semibold text-sm sm:hidden truncate max-w-[140px]">
          RainWater
        </span>

        {/* Search (hidden on small screens) */}
        <div className="hidden sm:flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
          <Search className="h-5 w-5 text-muted-foreground" />
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

      {/* Right section - minimal on mobile */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Refresh button - hidden on mobile */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={cn(touchButtonClasses, 'hidden sm:flex')}
          aria-label="Refresh data"
        >
          <RefreshCw
            className={cn('h-5 w-5', isRefreshing && 'animate-spin')}
          />
        </Button>

        {/* Theme toggle - always visible, touch-friendly */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onThemeToggle}
          className={touchButtonClasses}
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Sun className="h-5 w-5 sm:h-5 sm:w-5" />
          ) : (
            <Moon className="h-5 w-5 sm:h-5 sm:w-5" />
          )}
        </Button>

        {/* Notifications - always visible, touch-friendly */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(touchButtonClasses, 'relative')}
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {alertCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-0.5 -top-0.5 h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center"
            >
              {alertCount > 9 ? '9+' : alertCount}
            </Badge>
          )}
        </Button>

        {/* User menu - touch-friendly */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(touchButtonClasses, 'rounded-full')}
          aria-label="User menu"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            <User className="h-5 w-5" />
          </div>
        </Button>
      </div>
    </header>
  );
}
