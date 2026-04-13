/**
 * IOSInstallBanner
 *
 * Shows a dismissible hint to iOS Safari users telling them to add the app
 * to their Home Screen before push notifications can work.
 *
 * Conditions for showing:
 *  - Device is iOS (iPhone/iPad)
 *  - Browser is Safari (not Chrome/Firefox shell — they can't install either)
 *  - App is NOT already running in standalone mode (already installed)
 *  - User has not previously dismissed (localStorage flag)
 *  - A logged-in user is present (admin-only feature)
 */

import { useState, useEffect } from 'react';
import { X, Share } from 'lucide-react';
import { cn } from '~/lib/utils';

function isIosSafari() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  // Chrome/Firefox on iOS include 'CriOS'/'FxiOS' in UA
  const isSafari = /safari/i.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/i.test(ua);
  return isIOS && isSafari;
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.navigator.standalone === true;
}

const DISMISSED_KEY = 'ios_install_banner_dismissed';

export function IOSInstallBanner({ user }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!isIosSafari()) return;
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    setVisible(true);
  }, [user]);

  if (!visible) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 px-4 py-3',
        'bg-sky-50 dark:bg-sky-950/40',
        'border-b border-sky-200 dark:border-sky-800',
        'text-sky-900 dark:text-sky-100'
      )}
      role="status"
    >
      {/* Share icon — mirrors the actual iOS share button */}
      <div className="mt-0.5 shrink-0">
        <Share className="h-5 w-5 text-sky-500" />
      </div>

      <p className="flex-1 text-sm leading-snug">
        <span className="font-semibold">Enable push notifications — </span>
        tap the{' '}
        <span className="inline-flex items-center gap-0.5 font-medium">
          Share <Share className="inline h-3.5 w-3.5" />
        </span>{' '}
        button in Safari, then select{' '}
        <span className="font-medium">"Add to Home Screen"</span>. Open the app
        from your home screen to receive alerts.
      </p>

      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="mt-0.5 shrink-0 rounded p-0.5 text-sky-500 hover:bg-sky-100 dark:hover:bg-sky-900"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
