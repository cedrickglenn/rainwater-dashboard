/**
 * Topbar Component
 * Top navigation bar with mobile menu toggle, search, and user actions
 *
 * MOBILE-FIRST DESIGN (Updated):
 * - Height: 60px on mobile (up from 56px) for better touch ergonomics
 * - Touch targets: 48px minimum (above WCAG 44px guideline)
 * - Icons: 24px on mobile for visibility (up from 20px)
 * - Spacing: generous gaps to prevent mis-taps
 * - Typography: larger app title on mobile (16px)
 */

import { useState } from 'react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Menu, Bell, Sun, Moon, Search, User, RefreshCw } from 'lucide-react';

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

  // Base classes for touch-friendly buttons (48px touch target)
  const touchButtonClasses =
    'min-h-[48px] min-w-[48px] h-12 w-12 touch-action-manipulation';

  return (
    <header
      className={cn(
        // MOBILE: 60px height for comfortable touch header
        // TABLET+: 64px for visual balance with sidebar
        'sticky top-0 z-30 flex h-[60px] items-center justify-between sm:h-16',
        'border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60',
        // MOBILE: 16px padding, DESKTOP: 24px
        'px-4 lg:px-6',
        className
      )}
    >
      {/* Left section */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* 
          Mobile menu toggle - HIDDEN on mobile since bottom nav provides navigation.
          Only visible on tablet (sm to lg) where bottom nav is still shown but
          sidebar drawer might be useful for additional context.
          Keeping the hamburger for sm-lg breakpoint as a secondary option.
        */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className={cn(
            touchButtonClasses,
            'hidden rounded-xl sm:flex lg:hidden'
          )}
          aria-label="Open navigation menu"
        >
          <Menu className="h-6 w-6" />
        </Button>

        {/* App title on mobile - larger text (16px) for readability */}
        <span className="max-w-[160px] truncate text-base font-semibold sm:hidden">
          RainWater
        </span>

        {/* Search (hidden on small screens) */}
        <div className="hidden items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2.5 sm:flex">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="w-40 bg-transparent text-sm outline-none placeholder:text-muted-foreground lg:w-64"
            aria-label="Search"
          />
          <kbd className="hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground lg:inline-flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Right section - generous spacing between buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Refresh button - hidden on mobile */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={cn(touchButtonClasses, 'hidden rounded-xl sm:flex')}
          aria-label="Refresh data"
        >
          <RefreshCw
            className={cn(
              'h-5 w-5 sm:h-6 sm:w-6',
              isRefreshing && 'animate-spin'
            )}
          />
        </Button>

        {/* Theme toggle - 48px touch target, 24px icon */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onThemeToggle}
          className={cn(touchButtonClasses, 'rounded-xl')}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
        </Button>

        {/* Notifications - 48px touch target, 24px icon */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(touchButtonClasses, 'relative rounded-xl')}
          aria-label={`Notifications${alertCount > 0 ? `, ${alertCount} unread` : ''}`}
        >
          <Bell className="h-6 w-6" />
          {alertCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-0.5 top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[10px]"
            >
              {alertCount > 9 ? '9+' : alertCount}
            </Badge>
          )}
        </Button>

        {/* User menu - 48px touch target */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(touchButtonClasses, 'rounded-full')}
          aria-label="User menu"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
            <User className="h-5 w-5" />
          </div>
        </Button>
      </div>
    </header>
  );
}
