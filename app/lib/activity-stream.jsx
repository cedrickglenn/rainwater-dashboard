/**
 * ActivityStream — global SSE context
 *
 * Establishes a single /api/activity/stream connection for the entire app.
 * Any component can subscribe to new log entries via useActivityStream().
 * Toasts are fired here so they work on every page.
 *
 * Usage:
 *   const { liveStatus, deviceStatus, subscribe } = useActivityStream();
 *
 *   // deviceStatus shape:
 *   //   { esp32: { online: bool, lastSeen: string|null },
 *   //     mega:  { online: bool, lastSeen: string|null } }
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

const INITIAL_DEVICE_STATUS = {
  esp32: { online: false, lastSeen: null, loading: true },
  mega:  { online: false, lastSeen: null, loading: true },
};

export function ActivityStreamProvider({ children }) {
  const [liveStatus, setLiveStatus] = useState('connecting');
  const [deviceStatus, setDeviceStatus] = useState(INITIAL_DEVICE_STATUS);
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

      // Toast rules:
      //  • warnings and errors   — always toast
      //  • ACTUATOR / PUMP INFO  — toast so the user gets immediate feedback
      //    that a valve/pump command executed (e.g. "V1 opened").
      //    Strip the [MEGA] prefix since the toast context makes source clear.
      //  • everything else INFO  — silent (visible in activity log only)
      if (entry.type === 'warning' || entry.type === 'error') {
        const prefix = entry.source ? `[${entry.source}] ` : '';
        toast(`${prefix}${entry.message}`, { type: entry.type });
      } else if (
        entry.type === 'info' &&
        (entry.category === 'ACTUATOR' || entry.category === 'PUMP')
      ) {
        const msg = entry.message.replace(/^\[MEGA\]\s*/i, '');
        toast(msg, { type: 'info' });
      }
    });

    es.addEventListener('device-status', (e) => {
      setDeviceStatus(JSON.parse(e.data));
    });

    es.onerror = () => setLiveStatus('disconnected');

    return () => es.close();
  }, []);

  return (
    <ActivityStreamContext.Provider value={{ liveStatus, deviceStatus, subscribe }}>
      {children}
    </ActivityStreamContext.Provider>
  );
}

export function useActivityStream() {
  const ctx = useContext(ActivityStreamContext);
  if (!ctx) throw new Error('useActivityStream must be used inside ActivityStreamProvider');
  return ctx;
}
