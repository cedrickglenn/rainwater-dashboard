/**
 * MobileNav — expanding-pill bottom navigation.
 *
 * Active item: icon + label inside a rounded pill (bg-primary/10).
 * Inactive items: icon-only compact circles.
 *
 * This pattern fits any number of items without scrolling or shrinking
 * touch targets, because only the one active item expands — all others
 * stay at a fixed small width.
 *
 * Role filtering: items with minRole are hidden unless the user meets
 * the threshold (viewer < operator < admin).
 */

import { NavLink, useLocation } from '@remix-run/react';
import { cn } from '~/lib/utils';
import {
  LayoutDashboard,
  Gauge,
  History,
  Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { name: 'Home',     href: '/',         icon: LayoutDashboard, minRole: null    },
  { name: 'Sensors',  href: '/sensors',  icon: Gauge,           minRole: null    },
  { name: 'History',  href: '/history',  icon: History,         minRole: null    },
  { name: 'Settings', href: '/settings', icon: Settings,        minRole: 'admin' },
];

const ROLE_LEVEL = { admin: 3, operator: 2, viewer: 1 };

function MobileNavItem({ item, isActive }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        // shared
        'flex flex-shrink-0 items-center justify-center',
        'h-11 transition-all duration-300 ease-out',
        'touch-action-manipulation',
        'active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        // active: pill with label
        isActive
          ? 'gap-2 rounded-full bg-primary/10 px-4 text-primary'
          : 'w-11 rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {isActive && (
        <span className="whitespace-nowrap text-xs font-semibold leading-none">
          {item.name}
        </span>
      )}
    </NavLink>
  );
}

export function MobileNav({ user = null }) {
  const location = useLocation();
  const userLevel = ROLE_LEVEL[user?.role] ?? 0;

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.minRole || userLevel >= (ROLE_LEVEL[item.minRole] ?? 0)
  );

  // Exact match for '/', prefix match for everything else.
  function isItemActive(item) {
    if (item.href === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.href);
  }

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-50',
        'lg:hidden',
        'border-t bg-card/95 backdrop-blur-lg',
        'supports-[backdrop-filter]:bg-card/80',
        'pb-safe'
      )}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex w-full items-center justify-evenly px-2 py-2">
        {visibleItems.map((item) => (
          <MobileNavItem
            key={item.href}
            item={item}
            isActive={isItemActive(item)}
          />
        ))}
      </div>
    </nav>
  );
}
