/**
 * MobileNav Component
 * Bottom navigation bar for mobile devices
 *
 * MOBILE UX IMPROVEMENTS:
 * - Fixed bottom position in thumb's natural reach zone
 * - Touch targets: 56px height for comfortable tapping
 * - Icons: 24px with visual feedback on tap
 * - Labels: 12px (up from 10px) for readability
 * - Safe area padding for notched devices (iPhone X+)
 * - Backdrop blur for modern appearance
 */

import { NavLink } from '@remix-run/react';
import { cn } from '~/lib/utils';
import { LayoutDashboard, Gauge, History, Settings, Wrench } from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Home',     href: '/',          icon: LayoutDashboard, minRole: null       },
  { name: 'Sensors',  href: '/sensors',   icon: Gauge,           minRole: null       },
  { name: 'History',  href: '/history',   icon: History,         minRole: null       },
  { name: 'Controls', href: '/actuators', icon: Wrench,          minRole: 'operator' },
  { name: 'Settings', href: '/settings',  icon: Settings,        minRole: 'admin'    },
];

/**
 * MobileNavItem Component
 * Individual navigation button with generous touch target
 */
function MobileNavItem({ item }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.href}
      className={({ isActive }) =>
        cn(
          // BASE: 56px height for comfortable touch (exceeds 48px minimum)
          'flex flex-col items-center justify-center gap-1.5',
          // Fixed width per item to prevent overflow (4 items = ~25% each with some margin)
          'min-h-[56px] w-[22%] max-w-[80px] py-2',
          'rounded-xl transition-all duration-200',
          'touch-action-manipulation',
          // Active state - clear visual distinction
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
          // Touch feedback
          'active:scale-95 active:bg-muted',
          // Focus state for accessibility
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
        )
      }
    >
      {/* Icon - 24px for clear visibility */}
      <Icon className="h-6 w-6" />
      {/* Label - 12px for readability (up from 10px) */}
      <span className="text-xs font-medium leading-none">{item.name}</span>
    </NavLink>
  );
}

/**
 * MobileNav Component
 * Fixed bottom navigation bar for mobile devices
 */
export function MobileNav({ user = null }) {
  const ROLE_LEVEL   = { admin: 3, operator: 2, viewer: 1 };
  const userLevel    = ROLE_LEVEL[user?.role] ?? 0;
  const visibleItems = NAV_ITEMS.filter((item) => !item.minRole || userLevel >= (ROLE_LEVEL[item.minRole] ?? 0));

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-50',
        'w-full max-w-full',
        'lg:hidden',
        'border-t bg-card/95 backdrop-blur-lg',
        'supports-[backdrop-filter]:bg-card/80',
        'pb-safe'
      )}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex w-full items-center justify-evenly px-1 py-1.5">
        {visibleItems.map((item) => (
          <MobileNavItem key={item.href} item={item} />
        ))}
      </div>
    </nav>
  );
}
