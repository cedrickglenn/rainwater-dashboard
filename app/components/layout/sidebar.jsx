/**
 * Sidebar Component
 * Main navigation sidebar for the dashboard
 * Responsive: drawer on mobile, fixed on desktop
 */

import { NavLink } from '@remix-run/react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import {
  LayoutDashboard,
  Gauge,
  History,
  Settings,
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
  },
  {
    name: 'Sensors',
    href: '/sensors',
    icon: Gauge,
    description: 'Sensor readings',
  },
  {
    name: 'History',
    href: '/history',
    icon: History,
    description: 'Logs and data',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'System settings',
  },
];

/**
 * NavItem Component
 * Individual navigation link
 */
function NavItem({ item, isCollapsed, onClick }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.href}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent',
          isActive
            ? 'bg-primary/10 text-primary hover:bg-primary/15'
            : 'text-muted-foreground hover:text-foreground',
          isCollapsed && 'justify-center px-2'
        )
      }
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {!isCollapsed && (
        <div className="flex flex-col">
          <span>{item.name}</span>
          <span className="text-xs font-normal text-muted-foreground hidden lg:block">
            {item.description}
          </span>
        </div>
      )}
    </NavLink>
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
}) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-card transition-all duration-300',
          // Mobile styles
          isOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop styles
          'lg:translate-x-0',
          isCollapsed ? 'lg:w-16' : 'lg:w-64',
          'w-72'
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div
            className={cn(
              'flex items-center gap-2',
              isCollapsed && 'lg:justify-center lg:w-full'
            )}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Droplets className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col lg:flex">
                <span className="text-sm font-bold">RainWater</span>
                <span className="text-xs text-muted-foreground">
                  Dashboard
                </span>
              </div>
            )}
          </div>

          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => (
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
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-medium">System Status</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    All systems operational
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Collapse toggle (desktop only) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className={cn(
              'mt-3 w-full hidden lg:flex',
              isCollapsed && 'justify-center'
            )}
          >
            <ChevronLeft
              className={cn(
                'h-4 w-4 transition-transform',
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
