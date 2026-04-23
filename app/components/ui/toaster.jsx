/**
 * Toaster — lightweight module-level toast system (no Radix dependency).
 *
 * Usage:
 *   import { toast } from '~/components/ui/toaster';
 *   toast('Pump P1 dry run detected', { type: 'error' });
 *
 * Mount <Toaster /> once in the layout. Toasts auto-dismiss after `duration` ms.
 */

import { useState, useEffect, useCallback } from 'react';
import { cn } from '~/lib/utils';
import { X, Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Module-level emitter — works without React context or prop drilling
// ---------------------------------------------------------------------------
const listeners = new Set();

/**
 * @param {string} message
 * @param {{ type?: 'info'|'success'|'warning'|'error', duration?: number }} options
 */
export function toast(message, { type = 'info', duration = 4000 } = {}) {
  const entry = { id: `${Date.now()}-${Math.random()}`, message, type, duration };
  listeners.forEach((fn) => fn(entry));
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const ICONS = {
  info:    Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error:   XCircle,
};

const ICON_STYLES = {
  info:    'text-blue-500',
  success: 'text-green-500',
  warning: 'text-amber-500',
  error:   'text-red-500',
};

const ITEM_STYLES = {
  info:    'border-blue-200   bg-blue-50   dark:border-blue-800   dark:bg-blue-950/90   text-blue-900   dark:text-blue-100',
  success: 'border-green-200  bg-green-50  dark:border-green-800  dark:bg-green-950/90  text-green-900  dark:text-green-100',
  warning: 'border-amber-200  bg-amber-50  dark:border-amber-800  dark:bg-amber-950/90  text-amber-900  dark:text-amber-100',
  error:   'border-red-200    bg-red-50    dark:border-red-800    dark:bg-red-950/90    text-red-900    dark:text-red-100',
};

// ---------------------------------------------------------------------------
// ToastItem
// ---------------------------------------------------------------------------
function ToastItem({ item, onDismiss }) {
  const Icon = ICONS[item.type] ?? Info;

  useEffect(() => {
    const t = setTimeout(() => onDismiss(item.id), item.duration);
    return () => clearTimeout(t);
  }, [item.id, item.duration, onDismiss]);

  return (
    <div
      className={cn(
        'flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 rounded-xl border px-4 py-3 shadow-lg',
        'animate-in slide-in-from-right-4 fade-in duration-200',
        ITEM_STYLES[item.type] ?? ITEM_STYLES.info
      )}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', ICON_STYLES[item.type])} />
      <p className="flex-1 text-sm font-medium leading-snug">{item.message}</p>
      <button
        onClick={() => onDismiss(item.id)}
        className="shrink-0 opacity-50 transition-opacity hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toaster — mount once in DashboardLayout
// ---------------------------------------------------------------------------
export function Toaster() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    // Prepend so newest toast appears at the top of the stack, cap at 4
    const handler = (entry) => setItems((prev) => [entry, ...prev].slice(0, 4));
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, []);

  const dismiss = useCallback(
    (id) => setItems((prev) => prev.filter((i) => i.id !== id)),
    []
  );

  if (items.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {items.map((item) => (
        <ToastItem key={item.id} item={item} onDismiss={dismiss} />
      ))}
    </div>
  );
}
