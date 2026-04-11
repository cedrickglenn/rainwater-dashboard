/**
 * ActivityStream — global SSE context
 *
 * Establishes a single /api/activity/stream connection for the entire app.
 * Any component can subscribe to new log entries via useActivityStream().
 * Toasts are fired here so they work on every page.
 *
 * Usage:
 *   const { liveStatus, subscribe } = useActivityStream();
 *
 *   useEffect(() => {
 *     return subscribe((entry) => {
 *       // entry: { id, source, level, type, message, category, timestamp }
 *     });
 *   }, [subscribe]);
 */

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { toast } from '~/components/ui/toaster';

const ActivityStreamContext = createContext(null);

export function ActivityStreamProvider({ children }) {
  const [liveStatus, setLiveStatus] = useState('connecting');
  const listenersRef = useRef(new Set());

  // Pages call subscribe(fn) to receive new entries.
  // Returns an unsubscribe function — safe to use as useEffect cleanup.
  const subscribe = useCallback((fn) => {
    listenersRef.current.add(fn);
    return () => listenersRef.current.delete(fn);
  }, []);

  useEffect(() => {
    const es = new EventSource('/api/activity/stream');

    es.addEventListener('ping', () => setLiveStatus('live'));

    es.addEventListener('log', (e) => {
      const entry = JSON.parse(e.data);
      setLiveStatus('live');

      // Notify all subscribed pages
      listenersRef.current.forEach((fn) => fn(entry));

      // Fire a global toast — visible on every route
      const prefix = entry.source ? `[${entry.source}] ` : '';
      toast(`${prefix}${entry.message}`, { type: entry.type });
    });

    es.onerror = () => setLiveStatus('disconnected');

    return () => es.close();
  }, []);

  return (
    <ActivityStreamContext.Provider value={{ liveStatus, subscribe }}>
      {children}
    </ActivityStreamContext.Provider>
  );
}

export function useActivityStream() {
  const ctx = useContext(ActivityStreamContext);
  if (!ctx) throw new Error('useActivityStream must be used inside ActivityStreamProvider');
  return ctx;
}
