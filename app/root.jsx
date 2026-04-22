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
  useLocation,
} from '@remix-run/react';
import { json } from '@remix-run/node';

// Styles
import '~/styles/tailwind.css';

// Layout
import { DashboardLayout } from '~/components/layout';
import { Toaster } from '~/components/ui/toaster';
import { ActivityStreamProvider } from '~/lib/activity-stream';

// Data
import { getWeather } from '~/lib/weather.server';

/**
 * Meta function for global SEO settings
 */
export const meta = () => {
  return [
    { title: 'RainSense | Smart Rainwater Monitoring' },
    {
      name: 'description',
      content:
        'Monitor rainwater quality and potability in real-time with our smart harvesting system',
    },
    { name: 'theme-color', content: '#1A6B8A' },
    { name: 'mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    { name: 'apple-mobile-web-app-title', content: 'RainSense' },
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
    href: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap',
  },
  { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
  { rel: 'manifest', href: '/manifest.json' },
];

/**
 * Loader for root data
 */
export const loader = async ({ request }) => {
  const { getUser } = await import('~/lib/auth.server');
  const { getDb } = await import('~/lib/db.server');

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [user, weather, db] = await Promise.all([
    getUser(request),
    getWeather(),
    getDb(),
  ]);
  const [alertCount, recentAlerts] = await Promise.all([
    db.collection('activity_logs').countDocuments({
      level: { $in: ['WARN', 'ERR'] },
      timestamp: { $gte: since },
    }),
    db.collection('activity_logs')
      .find({ level: { $in: ['WARN', 'ERR'] }, timestamp: { $gte: since } })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray(),
  ]);

  return json({
    alertCount,
    notifications: recentAlerts.map((e) => ({
      id:        e._id.toString(),
      level:     e.level,
      message:   e.message,
      source:    e.source ?? e.category ?? 'SYSTEM',
      timestamp: e.timestamp,
    })),
    user,
    weather,
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? null,
  });
};

/**
 * Root App Component
 */
export default function App() {
  const { alertCount, notifications, user, weather } = useLoaderData();
  const location = useLocation();
  const isStandalone = location.pathname === '/login';

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
        <ActivityStreamProvider>
          {isStandalone ? <Outlet /> : <DashboardLayout alertCount={alertCount} notifications={notifications} user={user} weather={weather} />}
        </ActivityStreamProvider>
        <Toaster />
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
