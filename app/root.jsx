/**
 * Root Layout
 * Main layout component that wraps all routes
 * Includes the DashboardLayout with sidebar and topbar
 */

import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from '@remix-run/react';
import { json } from '@remix-run/node';

// Styles
import '~/styles/tailwind.css';

// Layout
import { DashboardLayout } from '~/components/layout';

// Data
import { alerts } from '~/data/mock-data';

/**
 * Meta function for global SEO settings
 */
export const meta = () => {
  return [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { title: 'RainWater Dashboard | Smart Rainwater Monitoring System' },
    {
      name: 'description',
      content:
        'Monitor rainwater quality and potability in real-time with our smart harvesting system',
    },
  ];
};

/**
 * Links function for external resources
 */
export const links = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  },
  { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
];

/**
 * Loader for root data
 */
export const loader = async () => {
  // Count unread alerts for the topbar
  const unreadAlerts = alerts.filter((alert) => !alert.isRead).length;

  return json({
    alertCount: unreadAlerts,
  });
};

/**
 * Root App Component
 */
export default function App() {
  const { alertCount } = useLoaderData();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Meta />
        <Links />
        {/* Script to prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <DashboardLayout alertCount={alertCount} />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Error Boundary Component
 * Handles errors gracefully with a user-friendly message
 */
export function ErrorBoundary() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-destructive">Oops!</h1>
            <p className="mt-4 text-muted-foreground">
              Something went wrong. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
            >
              Refresh Page
            </button>
          </div>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
