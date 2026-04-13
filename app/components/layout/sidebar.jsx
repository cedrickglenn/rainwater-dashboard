/**
 * Sidebar Component
 * Main navigation sidebar for the dashboard
 * 
 * MOBILE-FIRST BEHAVIOR:
 * - Mobile: Full-screen drawer/sheet pattern (not thin sidebar)
 * - Drawer slides in from left with backdrop overlay
 * - Touch targets: 48px minimum height for nav items
 * - Icons: 24px for visibility
 * - Close button: prominent 48px touch target
 */

import { NavLink } from '@remix-run/react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import { useActivityStream } from '~/lib/activity-stream';
import { formatRelativeTime } from '~/lib/date-utils';
import {
  LayoutDashboard,
  Gauge,
  History,
  Settings,
  SlidersHorizontal,
  Wrench,
  Droplets,
  ChevronLeft,
  X,
} from 'lucide-react';

/**
 * Navigation items configuration
 */
const NAV_ITEMS = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    description: 'Overview and status',
    adminOnly: false,
  },
  {
    name: 'Sensors',
    href: '/sensors',
    icon: Gauge,
    description: 'Sensor readings',
    adminOnly: false,
  },
  {
    name: 'History',
    href: '/history',
    icon: History,
    description: 'Logs and data',
    adminOnly: false,
  },
  {
    name: 'Actuators',
    href: '/actuators',
    icon: Wrench,
    description: 'Manual pump & valve control',
    minRole: 'operator',
  },
  {
    name: 'Calibration',
    href: '/calibration',
    icon: SlidersHorizontal,
    description: 'Sensor calibration',
    minRole: 'admin',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'System settings',
    minRole: 'admin',
  },
];

/**
 * NavItem Component
 * Individual navigation link with 48px+ touch target
 */
function NavItem({ item, isCollapsed, onClick }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.href}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          // BASE: 48px minimum height, generous padding for touch
          'flex items-center gap-3 rounded-xl px-4 py-3 min-h-[48px]',
          'text-base font-medium transition-all',
          'touch-action-manipulation',
          // Active state
          isActive
            ? 'bg-primary/10 text-primary hover:bg-primary/15'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent',
          // Focus state for accessibility
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // Collapsed state (desktop only)
          isCollapsed && 'lg:justify-center lg:px-2'
        )
      }
    >
      {/* Icon: 24px for mobile visibility */}
      <Icon className="h-6 w-6 flex-shrink-0" />
      {!isCollapsed && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[15px] leading-tight">{item.name}</span>
          <span className="text-xs font-normal text-muted-foreground hidden lg:block">
            {item.description}
          </span>
        </div>
      )}
    </NavLink>
  );
}

/**
 * DeviceStatusDot — a single device row in the System Status panel.
 */
function DeviceStatusDot({ label, online, lastSeen, loading }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
          {online && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          )}
          <span
            className={cn(
              'relative inline-flex h-2.5 w-2.5 rounded-full',
              loading ? 'bg-muted-foreground/40' : online ? 'bg-green-500' : 'bg-red-500'
            )}
          />
        </span>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className={cn('text-[11px]', loading ? 'text-muted-foreground' : online ? 'text-green-600 dark:text-green-400' : 'text-red-500')}>
        {loading ? 'Checking…' : online ? 'Online' : lastSeen ? `${formatRelativeTime(lastSeen)}` : 'Offline'}
      </span>
    </div>
  );
}

/**
 * Sidebar Component
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Mobile sidebar open state
 * @param {function} props.onClose - Close handler for mobile
 * @param {boolean} props.isCollapsed - Desktop collapsed state
 * @param {function} props.onToggleCollapse - Toggle collapse handler
 */
export function Sidebar({
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
  user = null,
}) {
  const ROLE_LEVEL = { admin: 3, operator: 2, viewer: 1 };
  const userLevel  = ROLE_LEVEL[user?.role] ?? 0;
  const { deviceStatus } = useActivityStream();
  return (
    <>
      {/* Mobile overlay - darker for better contrast */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-card transition-transform duration-300 ease-out',
          // MOBILE: 80% width max 320px for comfortable drawer
          'w-[80vw] max-w-[320px]',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          // DESKTOP: fixed sidebar, no transform
          'lg:translate-x-0 lg:transition-[width]',
          isCollapsed ? 'lg:w-16' : 'lg:w-64'
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Header - 64px height to match topbar */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div
            className={cn(
              'flex items-center gap-3',
              isCollapsed && 'lg:justify-center lg:w-full'
            )}
          >
            {/* Logo - 40px touch target */}
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Droplets className="h-6 w-6" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-base font-bold">RainWater</span>
                <span className="text-xs text-muted-foreground">
                  Dashboard
                </span>
              </div>
            )}
          </div>

          {/* Mobile close button - 48px touch target */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-12 w-12 min-h-[48px] min-w-[48px] lg:hidden rounded-xl"
            aria-label="Close navigation menu"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Navigation - generous spacing between items */}
        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
          <div className="space-y-1.5">
            {NAV_ITEMS.filter((item) => !item.minRole || userLevel >= (ROLE_LEVEL[item.minRole] ?? 0)).map((item) => (
              <NavItem
                key={item.href}
                item={item}
                isCollapsed={isCollapsed}
                onClick={onClose}
              />
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t p-3">
          {!isCollapsed && (
            <>
              <Separator className="mb-3" />
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-sm font-medium mb-3">System Status</p>
                <div className="space-y-2">
                  <DeviceStatusDot
                    label="ESP32"
                    online={deviceStatus.esp32.online}
                    lastSeen={deviceStatus.esp32.lastSeen}
                    loading={deviceStatus.esp32.loading}
                  />
                  <DeviceStatusDot
                    label="Arduino MEGA"
                    online={deviceStatus.mega.online}
                    lastSeen={deviceStatus.mega.lastSeen}
                    loading={deviceStatus.mega.loading}
                  />
                </div>
              </div>
            </>
          )}

          {/* Collapse toggle (desktop only) - 44px touch target */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className={cn(
              'mt-3 w-full hidden lg:flex h-11 min-h-[44px]',
              isCollapsed && 'justify-center'
            )}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft
              className={cn(
                'h-5 w-5 transition-transform',
                isCollapsed && 'rotate-180'
              )}
            />
            {!isCollapsed && <span className="ml-2">Collapse</span>}
          </Button>
        </div>
      </aside>
    </>
  );
}
