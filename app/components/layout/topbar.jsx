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
import { Form, Link } from '@remix-run/react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '~/components/ui/tooltip';
import {
  Menu, Bell, Sun, Moon, Search, User, RefreshCw, LogIn, LogOut, ShieldCheck,
} from 'lucide-react';

// Meteocons SVG from /public/weather-icons/
function TopbarWeatherIcon({ name, className }) {
  return (
    <img
      src={`/weather-icons/${name}.svg`}
      alt=""
      className={cn('shrink-0', className)}
      draggable={false}
    />
  );
}

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
  user = null,
  weather = null,
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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className={cn(
                touchButtonClasses,
                'flex rounded-xl lg:hidden'
              )}
              aria-label="Open navigation menu"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open navigation menu</TooltipContent>
        </Tooltip>

        {/* App title on mobile */}
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
        {/* Weather indicator — mobile: icon + temp pill, desktop: full label */}
        {weather?.current && (
          <>
            {/* Mobile pill: icon + temp, compact */}
            <div className="flex items-center gap-1 rounded-full border bg-muted/60 px-2.5 py-1 lg:hidden">
              <TopbarWeatherIcon
                name={weather.current.icon}

                className="h-[22px] w-[22px] shrink-0"
              />
              <span className="text-[13px] font-semibold tabular-nums leading-none">
                {weather.current.temp}°
              </span>
            </div>
            {/* Desktop: full pill with label */}
            <div className="hidden items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm lg:flex">
              <TopbarWeatherIcon
                name={weather.current.icon}

                className="h-5 w-5"
              />
              <span className="font-medium">{weather.current.temp}°C</span>
              <span className="hidden text-xs text-muted-foreground xl:block">
                {weather.current.label}
              </span>
            </div>
          </>
        )}

        {/* Refresh button - hidden on mobile */}
        <Tooltip>
          <TooltipTrigger asChild>
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
          </TooltipTrigger>
          <TooltipContent>Refresh data</TooltipContent>
        </Tooltip>

        {/* Theme toggle - 48px touch target, 24px icon */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onThemeToggle}
              className={cn(touchButtonClasses, 'rounded-xl')}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isDark ? 'Switch to light mode' : 'Switch to dark mode'}</TooltipContent>
        </Tooltip>

        {/* Notifications - 48px touch target, 24px icon */}
        <Tooltip>
          <TooltipTrigger asChild>
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
          </TooltipTrigger>
          <TooltipContent>
            {alertCount > 0 ? `${alertCount} unread notification${alertCount > 1 ? 's' : ''}` : 'Notifications'}
          </TooltipContent>
        </Tooltip>

        {/* User menu */}
        {user ? (
          <div className="flex items-center gap-1.5">
            <div className={cn(
              'hidden items-center gap-1.5 rounded-xl border px-3 py-1.5 sm:flex',
              'text-xs font-medium text-muted-foreground'
            )}>
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              {user.username}
            </div>
            <Form method="post" action="/logout">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    className={cn(touchButtonClasses, 'rounded-xl')}
                    aria-label="Sign out"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sign out</TooltipContent>
              </Tooltip>
            </Form>
          </div>
        ) : (
          <Link to="/login">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-xl"
              aria-label="Sign in"
            >
              <LogIn className="h-4 w-4" />
              <span>Login</span>
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
