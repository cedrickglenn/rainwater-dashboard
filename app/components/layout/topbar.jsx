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

import { useState, useRef, useEffect } from 'react';
import { Form, Link } from '@remix-run/react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '~/components/ui/tooltip';
import {
  Menu,
  Bell,
  Sun,
  Moon,
  RefreshCw,
  LogIn,
  LogOut,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Info,
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
function NotificationsPanel({ notifications, alertCount, onClose }) {
  const levelIcon = (level) => {
    if (level === 'ERR')
      return <XCircle className="h-4 w-4 shrink-0 text-[#DC2645]" />;
    if (level === 'WARN')
      return <AlertTriangle className="h-4 w-4 shrink-0 text-[#D97706]" />;
    if (level === 'OK')
      return <CheckCircle className="h-4 w-4 shrink-0 text-[#16A876]" />;
    return <Info className="h-4 w-4 shrink-0 text-muted-foreground" />;
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border bg-card shadow-lg">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-semibold">Notifications</span>
        {alertCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {alertCount} in last 24h
          </span>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            No warnings or errors in the last 24 hours
          </div>
        ) : (
          <ul>
            {notifications.map((n) => (
              <li
                key={n.id}
                className="flex gap-3 border-b px-4 py-3 last:border-0"
              >
                <div className="mt-0.5">{levelIcon(n.level)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{n.message}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="uppercase">{n.source}</span>
                    <span>·</span>
                    <span>{formatTime(n.timestamp)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function Topbar({
  onMenuClick,
  theme = 'light',
  onThemeToggle,
  alertCount = 0,
  notifications = [],
  user = null,
  weather = null,
  className,
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    if (!notifOpen) return;
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

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
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
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
              className={cn(touchButtonClasses, 'flex rounded-xl lg:hidden')}
              aria-label="Open navigation menu"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open navigation menu</TooltipContent>
        </Tooltip>

        {/* App title on mobile — links to home for UX */}
        <Link
          to="/"
          className="truncate text-base font-semibold transition-opacity hover:opacity-75 sm:hidden"
        >
          RainSense
        </Link>
      </div>

      {/* Right section - generous spacing between buttons */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {/* Weather indicator — mobile: icon + temp pill, desktop: full label */}
        {weather?.current && (
          <>
            {/* Mobile pill: icon + temp, compact */}
            <div className="flex h-9 items-center gap-1 rounded-full border bg-muted/60 px-2.5 lg:hidden">
              <TopbarWeatherIcon
                name={weather.current.icon}
                className="weather-icon h-[22px] w-[22px] shrink-0 self-center"
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
              aria-label={
                isDark ? 'Switch to light mode' : 'Switch to dark mode'
              }
            >
              {isDark ? (
                <Sun className="h-6 w-6" />
              ) : (
                <Moon className="h-6 w-6" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          </TooltipContent>
        </Tooltip>

        {/* Notifications - 48px touch target, 24px icon */}
        <div className="relative" ref={notifRef}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setNotifOpen((o) => !o)}
                className={cn(touchButtonClasses, 'relative rounded-xl')}
                aria-label={`Notifications${alertCount > 0 ? `, ${alertCount} alerts` : ''}`}
                aria-expanded={notifOpen}
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
              {alertCount > 0
                ? `${alertCount} alert${alertCount > 1 ? 's' : ''} in last 24h`
                : 'Notifications'}
            </TooltipContent>
          </Tooltip>
          {notifOpen && (
            <NotificationsPanel
              notifications={notifications}
              alertCount={alertCount}
              onClose={() => setNotifOpen(false)}
            />
          )}
        </div>

        {/* User menu */}
        {user ? (
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                'hidden items-center gap-1.5 rounded-xl border px-3 py-1.5 sm:flex',
                'text-xs font-medium text-muted-foreground'
              )}
            >
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/login">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(touchButtonClasses, 'rounded-xl')}
                  aria-label="Sign in"
                >
                  <LogIn className="h-6 w-6" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Sign in</TooltipContent>
          </Tooltip>
        )}
      </div>
    </header>
  );
}
