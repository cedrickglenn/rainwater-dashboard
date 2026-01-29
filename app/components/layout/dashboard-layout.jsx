/**
 * DashboardLayout Component
 * Main layout wrapper with sidebar and topbar
 * Handles responsive behavior and theme management
 */

import { useState, useEffect } from 'react';
import { Outlet } from '@remix-run/react';
import { cn } from '~/lib/utils';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { TooltipProvider } from '~/components/ui/tooltip';

/**
 * DashboardLayout Component
 * @param {Object} props - Component props
 * @param {number} props.alertCount - Number of alerts for topbar
 */
export function DashboardLayout({ alertCount = 0 }) {
  // Mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Desktop sidebar collapsed state
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Theme state
  const [theme, setTheme] = useState('light');

  /**
   * Initialize theme from localStorage or system preference
   */
  useEffect(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      // Check system preference
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
   * Toggle mobile sidebar
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
        {/* Sidebar */}
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
            // Adjust margin for sidebar
            'lg:ml-64',
            isCollapsed && 'lg:ml-16'
          )}
        >
          {/* Topbar */}
          <Topbar
            onMenuClick={handleMenuClick}
            theme={theme}
            onThemeToggle={handleThemeToggle}
            alertCount={alertCount}
          />

          {/* Page content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>

          {/* Footer */}
          <footer className="border-t py-4 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
              <p>
                © 2026 Smart Rainwater Harvesting System. Thesis Project.
              </p>
              <p>
                Built with Remix, Tailwind CSS & shadcn/ui
              </p>
            </div>
          </footer>
        </div>
      </div>
    </TooltipProvider>
  );
}
