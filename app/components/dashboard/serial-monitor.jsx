/**
 * SerialMonitor
 * Streams live log output from the ESP32/Mega via MQTT → SSE.
 *
 * Two channels:
 *   rainwater/logs  — structured events (boot, WiFi, MQTT, errors, MEGA logs)
 *   rainwater/debug — raw wsLogf() verbose output (every debug print)
 *
 * Displays a terminal-style panel with level-based colour coding.
 * Debug lines are dimmer and toggleable via the DBG button.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import {
  Terminal,
  Trash2,
  PauseCircle,
  PlayCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_LINES = 500;

const LEVEL_STYLES = {
  WARN: { text: 'text-amber-400',   label: 'WARN' },
  ERR:  { text: 'text-red-400',     label: 'ERR ' },
  OK:   { text: 'text-green-400',   label: 'OK  ' },
  INFO: { text: 'text-zinc-300 dark:text-zinc-300', label: 'INFO' },
};

function levelStyle(level) {
  return LEVEL_STYLES[level] ?? LEVEL_STYLES.INFO;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-PH', {
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

// ---------------------------------------------------------------------------
// StatusDot
// ---------------------------------------------------------------------------

function StatusDot({ mqttStatus }) {
  if (mqttStatus === 'live') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-green-400">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        LIVE
      </span>
    );
  }
  if (mqttStatus === 'reconnecting') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-amber-400">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
        </span>
        Reconnecting…
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-zinc-500">
      <span className="h-2 w-2 rounded-full bg-zinc-600" />
      Connecting…
    </span>
  );
}

// ---------------------------------------------------------------------------
// LogLine
// ---------------------------------------------------------------------------

function LogLine({ line }) {
  const isDebug = line.channel === 'debug';

  if (isDebug) {
    const debugRaw = line.raw ?? line.message ?? '';

    // Batched Mega telemetry cycle — "MEGA|KEY=VALUE|KEY=VALUE|..."
    // Split back into individual [Mega] KEY = VALUE lines for readability.
    if (debugRaw.startsWith('MEGA|')) {
      const pairs = debugRaw.slice(5).split('|').map((p) => {
        const eq = p.indexOf('=');
        return eq < 0 ? null : { key: p.slice(0, eq), value: p.slice(eq + 1) };
      }).filter(Boolean);
      return (
        <div className="font-mono text-xs opacity-50 mb-0.5">
          <div className="flex gap-2">
            <span className="shrink-0 text-zinc-400 dark:text-zinc-500">{formatTime(line.ts)}</span>
            <span className="shrink-0 w-9 text-zinc-400 dark:text-zinc-500">DBG</span>
            <span className="text-zinc-500 dark:text-zinc-400">[Mega] Sensors</span>
          </div>
          <div className="ml-[4.25rem] grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-0 leading-relaxed">
            {pairs.map(({ key, value }) => (
              <span key={key} className="text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                <span className="text-zinc-500 dark:text-zinc-400">{key}</span>{' = '}{value}
              </span>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="flex gap-2 font-mono text-xs leading-relaxed opacity-50">
        <span className="shrink-0 text-zinc-400 dark:text-zinc-500">{formatTime(line.ts)}</span>
        <span className="shrink-0 w-9 text-zinc-400 dark:text-zinc-500">DBG</span>
        <span className="break-all text-zinc-400 dark:text-zinc-500">{debugRaw}</span>
      </div>
    );
  }

  const { text: levelText, label } = levelStyle(line.level);
  return (
    <div className="flex gap-2 font-mono text-xs leading-relaxed">
      <span className="shrink-0 text-zinc-400 dark:text-zinc-500">{formatTime(line.ts)}</span>
      <span className={cn('w-9 shrink-0 font-semibold', levelText)}>{label}</span>
      {line.source && (
        <span className="w-16 shrink-0 truncate text-zinc-400 dark:text-zinc-400">{line.source}</span>
      )}
      <span className="break-all text-zinc-900 dark:text-white">{line.message}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SerialMonitor
// ---------------------------------------------------------------------------

export function SerialMonitor({ className }) {
  const [isOpen,       setIsOpen]       = useState(true);
  const [lines,        setLines]        = useState([]);
  const [isPaused,     setIsPaused]     = useState(false);
  const [showDebug,    setShowDebug]    = useState(true);
  const [sseStatus,    setSseStatus]    = useState('connecting'); // connecting | live | disconnected
  const [mqttStatus,   setMqttStatus]   = useState('connecting'); // connecting | live | reconnecting

  const containerRef    = useRef(null);
  const isPausedRef     = useRef(isPaused);
  const isAutoScrollRef = useRef(false);
  isPausedRef.current   = isPaused;

  // Auto-scroll to bottom unless paused
  useEffect(() => {
    const el = containerRef.current;
    if (!el || isPaused) return;
    isAutoScrollRef.current = true;
    el.scrollTop = el.scrollHeight;
    requestAnimationFrame(() => { isAutoScrollRef.current = false; });
  }, [lines, isPaused]);

  // Pause on scroll up, resume on scroll to bottom
  const handleScroll = useCallback(() => {
    if (isAutoScrollRef.current) return;
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (atBottom  && isPausedRef.current)  setIsPaused(false);
    if (!atBottom && !isPausedRef.current) setIsPaused(true);
  }, []);

  // SSE connection
  useEffect(() => {
    if (!isOpen) return;

    const es = new EventSource('/api/logs/stream');

    es.addEventListener('ping', () => setSseStatus('live'));

    es.addEventListener('status', (e) => {
      const { connected, reconnecting } = JSON.parse(e.data);
      setSseStatus('live');
      if (connected)         setMqttStatus('live');
      else if (reconnecting) setMqttStatus('reconnecting');
      else                   setMqttStatus('connecting');
    });

    es.addEventListener('log', (e) => {
      if (isPausedRef.current) return;
      const entry = JSON.parse(e.data);
      setSseStatus('live');
      // Only promote mqttStatus to live on structured log events —
      // debug traffic alone doesn't confirm the broker is healthy
      if (entry.channel === 'logs') setMqttStatus('live');
      setLines((prev) => {
        const next = [...prev, { id: `${entry.ts}-${Math.random()}`, ...entry }];
        return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
      });
    });

    es.onerror = () => {
      setSseStatus('disconnected');
      setMqttStatus('connecting');
    };

    return () => es.close();
  }, [isOpen]);

  const handleClear = () => setLines([]);
  const togglePause = () => setIsPaused((p) => !p);
  const toggleOpen  = () => setIsOpen((o) => !o);

  const visibleLines = showDebug ? lines : lines.filter((l) => l.channel !== 'debug');
  const debugCount   = lines.filter((l) => l.channel === 'debug').length;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="px-4 py-3">
        <CardTitle className="flex items-center justify-between text-base">
          {/* Left: title + status */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              Serial Monitor
            </span>
            {isOpen && <StatusDot mqttStatus={mqttStatus} />}
            {isOpen && (
              <span className="hidden text-[10px] font-normal text-zinc-500 sm:block">
                rainwater/logs · rainwater/debug
              </span>
            )}
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-1">
            {isOpen && (
              <>
                {/* Debug toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDebug((d) => !d)}
                  className={cn(
                    'h-7 px-2 font-mono text-[10px]',
                    showDebug ? 'text-zinc-400' : 'text-zinc-600'
                  )}
                  title={showDebug ? 'Hide debug output' : 'Show debug output'}
                >
                  DBG
                  {debugCount > 0 && (
                    <span className="ml-1 text-zinc-600">
                      {debugCount}
                    </span>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={togglePause}
                  className="h-7 w-7"
                  title={isPaused ? 'Resume scroll' : 'Pause scroll'}
                >
                  {isPaused
                    ? <PlayCircle  className="h-4 w-4 text-amber-400" />
                    : <PauseCircle className="h-4 w-4 text-zinc-400" />
                  }
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClear}
                  className="h-7 w-7"
                  title="Clear"
                >
                  <Trash2 className="h-4 w-4 text-zinc-400" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleOpen}
              className="h-7 w-7"
              title={isOpen ? 'Collapse' : 'Expand'}
            >
              {isOpen
                ? <ChevronUp   className="h-4 w-4" />
                : <ChevronDown className="h-4 w-4" />
              }
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      {isOpen && (
        <CardContent className="p-0">
          {/* Terminal area */}
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="h-64 overflow-y-auto bg-zinc-100 dark:bg-zinc-950 px-4 py-3 sm:h-80"
          >
            {visibleLines.length === 0 ? (
              <p className="font-mono text-xs text-zinc-500 dark:text-zinc-600">
                {sseStatus === 'connecting'
                  ? 'Connecting to MQTT broker…'
                  : showDebug
                    ? 'Waiting for output on rainwater/logs · rainwater/debug…'
                    : 'Waiting for structured events on rainwater/logs…'}
              </p>
            ) : (
              <div className="space-y-0.5">
                {visibleLines.map((line) => (
                  <LogLine key={line.id} line={line} />
                ))}
              </div>
            )}
          </div>

          {/* Footer bar */}
          <div className="flex items-center justify-between border-t bg-zinc-200 dark:bg-zinc-900 px-4 py-1.5">
            <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-600">
              {visibleLines.length} line{visibleLines.length !== 1 ? 's' : ''}
              {!showDebug && debugCount > 0 && (
                <span className="ml-2 text-zinc-400 dark:text-zinc-700">{debugCount} debug hidden</span>
              )}
              {lines.length >= MAX_LINES && ` (capped at ${MAX_LINES})`}
            </span>
            {isPaused && (
              <span className="font-mono text-[10px] text-amber-400">
                ⏸ Scroll paused — scroll to bottom to resume
              </span>
            )}
            {sseStatus === 'disconnected' && (
              <span className="font-mono text-[10px] text-zinc-500">
                SSE disconnected — reconnecting…
              </span>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
