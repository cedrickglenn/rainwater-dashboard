/**
 * ActivityStream — global SSE context
 *
 * Establishes a single /api/activity/stream connection for the entire app.
 * Any component can subscribe to new log entries via useActivityStream().
 * Toasts are fired here so they work on every page.
 *
 * Usage:
 *   const { liveStatus, deviceStatus, subscribe, subscribeActuators } = useActivityStream();
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
  const actuatorListenersRef = useRef(new Set());

  const subscribe = useCallback((fn) => {
    listenersRef.current.add(fn);
    return () => listenersRef.current.delete(fn);
  }, []);

  // Pages call subscribeActuators(fn) to receive actuator state snapshots.
  // fn receives { states: { [id]: { state, type, confirmed } } }
  const subscribeActuators = useCallback((fn) => {
    actuatorListenersRef.current.add(fn);
    return () => actuatorListenersRef.current.delete(fn);
  }, []);

  useEffect(() => {
    const es = new EventSource('/api/activity/stream');

    es.addEventListener('ping', () => setLiveStatus('live'));

    es.addEventListener('log', (e) => {
      const entry = JSON.parse(e.data);
      setLiveStatus('live');

      listenersRef.current.forEach((fn) => fn(entry));

      if (entry.type === 'warning' || entry.type === 'error') {
        const msg = entry.message.replace(/^\[MEGA\]\s*/i, '');
        toast(msg, { type: entry.type });
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

    es.addEventListener('actuator-state', (e) => {
      const data = JSON.parse(e.data);
      actuatorListenersRef.current.forEach((fn) => fn(data));
    });

    es.onerror = () => setLiveStatus('disconnected');

    return () => es.close();
  }, []);

  return (
    <ActivityStreamContext.Provider value={{ liveStatus, deviceStatus, subscribe, subscribeActuators }}>
      {children}
    </ActivityStreamContext.Provider>
  );
}

export function useActivityStream() {
  const ctx = useContext(ActivityStreamContext);
  if (!ctx) throw new Error('useActivityStream must be used inside ActivityStreamProvider');
  return ctx;
}
