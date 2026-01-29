/**
 * MobileNav Component
 * Bottom navigation bar for mobile devices
 * 
 * MOBILE UX STRATEGY:
 * - Fixed bottom position for thumb-friendly access (reachable zone)
 * - Large 48px touch targets exceed the 44px minimum
 * - Visual feedback on active state
 * - Safe area padding for notched devices
 * - Hidden on desktop (lg:hidden)
 */

import { NavLink } from '@remix-run/react';
import { cn } from '~/lib/utils';
import {
  LayoutDashboard,
  Gauge,
  History,
  Settings,
} from 'lucide-react';

/**
 * Navigation items - same as sidebar for consistency
 */
const NAV_ITEMS = [
  {
    name: 'Home',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Sensors',
    href: '/sensors',
    icon: Gauge,
  },
  {
    name: 'History',
    href: '/history',
    icon: History,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

/**
 * MobileNavItem Component
 * Individual navigation button with large touch target
 */
function MobileNavItem({ item }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.href}
      className={({ isActive }) =>
        cn(
          // Base styles - large touch target (48px minimum)
          'flex flex-col items-center justify-center gap-1',
          'min-h-[48px] min-w-[48px] flex-1',
          'rounded-xl transition-all duration-200',
          // Active state styling
          isActive
            ? 'text-primary bg-primary/10'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          // Touch feedback
          'active:scale-95 active:bg-muted'
        )
      }
    >
      {/* Icon - larger size (24px) for better visibility and touch */}
      <Icon className="h-6 w-6" />
      {/* Label - visible for clarity */}
      <span className="text-[10px] font-medium leading-none">{item.name}</span>
    </NavLink>
  );
}

/**
 * MobileNav Component
 * Fixed bottom navigation bar for mobile devices
 */
export function MobileNav() {
  return (
    <nav
      className={cn(
        // Fixed bottom position
        'fixed bottom-0 left-0 right-0 z-50',
        // Only show on mobile (hidden on lg and up)
        'lg:hidden',
        // Visual styling
        'border-t bg-card/95 backdrop-blur-lg',
        'supports-[backdrop-filter]:bg-card/80',
        // Safe area padding for notched devices (iPhone X+)
        'pb-safe'
      )}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => (
          <MobileNavItem key={item.href} item={item} />
        ))}
      </div>
    </nav>
  );
}
