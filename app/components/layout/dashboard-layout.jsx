/**
 * DashboardLayout Component - Mobile-First Refactor
 * 
 * MOBILE UX IMPROVEMENTS:
 * 1. Bottom navigation for mobile (thumb-friendly, in the "easy reach" zone)
 * 2. Simplified topbar on mobile (less clutter)
 * 3. Sidebar only visible on desktop (lg+)
 * 4. Added bottom padding on mobile to prevent content overlap with nav
 * 5. Smooth transitions and better touch feedback
 * 6. Footer hidden on mobile to maximize content space
 */

import { useState, useEffect } from 'react';
import { Outlet } from '@remix-run/react';
import { cn } from '~/lib/utils';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { MobileNav } from './mobile-nav';
import { TooltipProvider } from '~/components/ui/tooltip';

/**
 * DashboardLayout Component
 * @param {Object} props - Component props
 * @param {number} props.alertCount - Number of alerts for topbar
 */
export function DashboardLayout({ alertCount = 0 }) {
  // Mobile sidebar state - drawer for mobile (optional, can still access via hamburger)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Desktop sidebar collapsed state
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Theme state
  const [theme, setTheme] = useState('light');

  /**
   * Initialize theme from localStorage or system preference
   */
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      setTheme(prefersDark ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  }, []);

  /**
   * Toggle theme between light and dark
   */
  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  /**
   * Toggle mobile sidebar drawer
   */
  const handleMenuClick = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  /**
   * Close mobile sidebar
   */
  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  /**
   * Toggle desktop sidebar collapse
   */
  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* 
          Sidebar - Desktop only (lg+)
          On mobile, primary navigation is via bottom nav
          Sidebar drawer is still accessible via hamburger menu for additional features
        */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={handleCloseSidebar}
          isCollapsed={isCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />

        {/* Main content area */}
        <div
          className={cn(
            'flex min-h-screen flex-col transition-all duration-300',
            // Desktop: adjust left margin for sidebar
            'lg:ml-64',
            isCollapsed && 'lg:ml-16'
          )}
        >
          {/* Topbar - streamlined on mobile */}
          <Topbar
            onMenuClick={handleMenuClick}
            theme={theme}
            onThemeToggle={handleThemeToggle}
            alertCount={alertCount}
          />

          {/* 
            Page content 
            MOBILE UX: 
            - Generous bottom padding (pb-24) prevents content from being
              hidden behind the fixed bottom navigation bar
            - Reduced horizontal padding on mobile for more content width
            - Vertical rhythm maintained with consistent spacing
          */}
          <main
            className={cn(
              'flex-1',
              // Mobile: compact horizontal padding, generous bottom for nav
              'px-4 py-4 pb-24',
              // Tablet: slightly more padding
              'sm:px-5 sm:py-5 sm:pb-28',
              // Desktop: full padding, no extra bottom (no bottom nav)
              'lg:px-8 lg:py-6 lg:pb-6'
            )}
          >
            <Outlet />
          </main>

          {/* 
            Footer - Hidden on mobile to maximize screen real estate
            Only shown on desktop where space is abundant
          */}
          <footer className="hidden lg:block border-t py-4 px-8">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <p>© 2026 Smart Rainwater Harvesting System. Thesis Project.</p>
              <p>Built with Remix, Tailwind CSS & shadcn/ui</p>
            </div>
          </footer>
        </div>

        {/* 
          Mobile Bottom Navigation
          MOBILE UX: Fixed at bottom within thumb's natural arc
          - Large touch targets (48px+)
          - Always visible for quick navigation
          - Hidden on desktop where sidebar handles navigation
        */}
        <MobileNav />
      </div>
    </TooltipProvider>
  );
}
