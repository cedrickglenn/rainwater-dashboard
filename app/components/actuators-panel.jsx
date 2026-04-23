/**
 * ActuatorsPanel — manual pump & valve control UI.
 *
 * Extracted from the former /actuators route so it can be rendered as a tab
 * inside /settings. The panel is self-contained: it receives persisted state
 * + filter/backwash state as props, and sends commands via the
 * /api/actuators endpoint (Remix action fallback: /actuators).
 *
 * Behavior mirrors the original route — optimistic UI, command debouncing,
 * pending state with stale-ACK fallback timer, and revalidator-driven ACK
 * polling when anything is unconfirmed.
 */

import { useRevalidator } from '@remix-run/react';
import { useState, useEffect, useRef } from 'react';
import { useActivityStream } from '~/lib/activity-stream';
import { cn } from '~/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import {
  AlertTriangle,
  Power,
  Zap,
  Droplets,
  ArrowRight,
  PlayCircle,
  StopCircle,
  Info,
  Filter,
  RotateCcw,
} from 'lucide-react';

export const VALVES = [
  { id: 'V1', label: 'V1', route: 'C1 → C2',       description: 'Pass-through after first flush' },
  { id: 'V2', label: 'V2', route: 'C2 → Filter',   description: 'Charcoal filter intake' },
  { id: 'V3', label: 'V3', route: 'Filter → C6',   description: 'Direct bypass — skips RO' },
  { id: 'V4', label: 'V4', route: 'Filter → C4',   description: 'To commercial RO path' },
  { id: 'V5', label: 'V5', route: 'Filter Drain',  description: 'Backwash drain outlet' },
  { id: 'V6', label: 'V6', route: 'C5 → C4',       description: 'Feedback / recycle path' },
  { id: 'V7', label: 'V7', route: 'C5 → C6',       description: 'Good water pass-through' },
  { id: 'V8', label: 'V8', route: 'First Flush',   description: 'Routes initial rain to drain' },
];

export const PUMPS = [
  { id: 'P1', label: 'P1', route: 'C2 → Filter',     description: 'Buffer tank to charcoal filter' },
  { id: 'P2', label: 'P2', route: 'C4 → RO',         description: 'Pre-RO buffer to commercial RO' },
  { id: 'P3', label: 'P3', route: 'C5 Output',       description: 'C5 to C6 or feedback path' },
  { id: 'P4', label: 'P4', route: 'C5 → C4 Recycle', description: 'Feedback booster pump' },
];

const QUICK_ACTIONS = [
  {
    id: 'fill_c2',
    label: 'Fill C2 (Buffer Tank)',
    description: 'Opens V1 so water flows from C1 into C2. No pump needed — gravity fed.',
    affects: ['V1'],
    startCmds: [{ type: 'VALVE', id: 'V1', state: 'ON' }],
    stopCmds:  [{ type: 'VALVE', id: 'V1', state: 'OFF' }],
    note: 'Ensure Container 1 has water before opening.',
  },
  {
    id: 'fill_c3_filter',
    label: 'Fill C3 — Charcoal Filter',
    description: 'Opens V2 then starts P1 to pump from C2 into the charcoal filter body.',
    affects: ['V2', 'P1'],
    startCmds: [
      { type: 'VALVE', id: 'V2', state: 'ON' },
      { type: 'PUMP',  id: 'P1', state: 'ON' },
    ],
    stopCmds: [
      { type: 'PUMP',  id: 'P1', state: 'OFF' },
      { type: 'VALVE', id: 'V2', state: 'OFF' },
    ],
    note: 'C2 must have water. P1 must not run dry — stop immediately if C2 empties.',
  },
  {
    id: 'fill_c4',
    label: 'Fill C4 (Pre-RO Buffer)',
    description: 'Opens V2 + V4 and starts P1 to push water through the charcoal filter into C4.',
    affects: ['V2', 'V4', 'P1'],
    startCmds: [
      { type: 'VALVE', id: 'V2', state: 'ON' },
      { type: 'VALVE', id: 'V4', state: 'ON' },
      { type: 'PUMP',  id: 'P1', state: 'ON' },
    ],
    stopCmds: [
      { type: 'PUMP',  id: 'P1', state: 'OFF' },
      { type: 'VALVE', id: 'V4', state: 'OFF' },
      { type: 'VALVE', id: 'V2', state: 'OFF' },
    ],
    note: 'C2 must have water. Stop immediately when C4 reaches target level.',
  },
  {
    id: 'fill_c5_from_c4',
    label: 'Fill C5 (Quality Check Tank)',
    description: 'Starts P2 to push water from C4 through the RO filter into C5.',
    affects: ['P2'],
    startCmds: [{ type: 'PUMP', id: 'P2', state: 'ON' }],
    stopCmds:  [{ type: 'PUMP', id: 'P2', state: 'OFF' }],
    note: 'C4 must have water. RO membranes require adequate feed pressure.',
  },
  {
    id: 'fill_c6_direct',
    label: 'Fill C6 Direct (Bypass RO)',
    description: 'Opens V2 + V3 and starts P1 to push water from C2 through the charcoal filter directly into C6, skipping RO.',
    affects: ['V2', 'V3', 'P1'],
    startCmds: [
      { type: 'VALVE', id: 'V2', state: 'ON' },
      { type: 'VALVE', id: 'V3', state: 'ON' },
      { type: 'PUMP',  id: 'P1', state: 'ON' },
    ],
    stopCmds: [
      { type: 'PUMP',  id: 'P1', state: 'OFF' },
      { type: 'VALVE', id: 'V3', state: 'OFF' },
      { type: 'VALVE', id: 'V2', state: 'OFF' },
    ],
    note: 'Water bypasses RO — use only for level calibration, not potability testing.',
  },
  {
    id: 'drain_filter',
    label: 'Drain Charcoal Filter (V5)',
    description: 'Opens V5 to drain the filter body to waste. Used before backwash or maintenance.',
    affects: ['V5'],
    startCmds: [{ type: 'VALVE', id: 'V5', state: 'ON' }],
    stopCmds:  [{ type: 'VALVE', id: 'V5', state: 'OFF' }],
    note: null,
  },
];

export const ALL_OFF_STATE = Object.fromEntries(
  [...VALVES, ...PUMPS].map((a) => [a.id, false])
);

export const STALE_PENDING_MS = 5000;
const CMD_DEBOUNCE_MS = 150;

// Endpoint the panel posts commands to. The /actuators route retains its
// action handler even when its default export is a redirect, so fire-and-forget
// POSTs here still reach the MQTT publisher + persistence path.
const ACTUATORS_ACTION = '/actuators';

function postCommands(body) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(body)) fd.append(k, v);
  fetch(ACTUATORS_ACTION, { method: 'POST', body: fd }).catch(() => {});
}

function ActuatorCard({ actuator, isOn, isValve, isConfirmed, onToggle }) {
  const { id, label, route, description } = actuator;
  const isPending = !isConfirmed;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border p-4 transition-all',
        isOn
          ? 'border-primary bg-primary/5'
          : 'border-border bg-muted/20',
        isPending && 'opacity-70'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {isValve ? (
            <Droplets className={cn('h-4 w-4', isOn ? 'text-primary' : 'text-muted-foreground', isPending && 'animate-pulse')} />
          ) : (
            <Zap className={cn('h-4 w-4', isOn ? 'text-primary' : 'text-muted-foreground', isPending && 'animate-pulse')} />
          )}
          <span className="font-semibold">{label}</span>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'text-xs',
            isPending
              ? 'border-amber-400 text-amber-600 dark:text-amber-400'
              : isOn
                ? 'border-primary text-primary'
                : 'text-muted-foreground'
          )}
        >
          {isPending ? 'PENDING' : isOn ? (isValve ? 'OPEN' : 'ON') : (isValve ? 'CLOSED' : 'OFF')}
        </Badge>
      </div>

      <div className="flex items-center gap-1.5 text-sm font-medium">
        {route.split(' → ').map((part, i, arr) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className={cn(isOn ? 'text-primary' : 'text-foreground')}>{part}</span>
            {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
          </span>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{description}</p>

      <Button
        size="sm"
        variant={isOn ? 'destructive' : 'outline'}
        className="w-full"
        onClick={() => onToggle(isValve ? 'VALVE' : 'PUMP', id, isOn)}
      >
        {isOn ? `Turn Off ${label}` : `Turn On ${label}`}
      </Button>
    </div>
  );
}

function QuickActionCard({ action: qa, activeStates, onStart, onStop }) {
  const isRunning = qa.affects.some((id) => activeStates[id]);

  return (
    <Card className={cn('flex flex-col justify-between transition-all', isRunning && 'border-amber-400 dark:border-amber-600')}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{qa.label}</CardTitle>
          {isRunning && <Badge className="flex-shrink-0 bg-amber-500 text-white">Running</Badge>}
        </div>
        <CardDescription>{qa.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {qa.affects.map((id) => (
            <Badge key={id} variant="outline" className={cn('text-xs', activeStates[id] && 'border-amber-400 text-amber-600 dark:text-amber-400')}>
              {id}
            </Badge>
          ))}
        </div>

        {qa.note && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            {qa.note}
          </div>
        )}

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={() => onStart(qa)}>
            <PlayCircle className="h-4 w-4" />
            Start
          </Button>
          <Button size="sm" variant={isRunning ? 'destructive' : 'outline'} className="flex-1 gap-2" onClick={() => onStop(qa)}>
            <StopCircle className="h-4 w-4" />
            Stop
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ActuatorsPanel({ persisted, filterMode, backwashState }) {
  const revalidator = useRevalidator();
  const { subscribeActuators } = useActivityStream();

  const [states, setStates] = useState(() => ({
    ...ALL_OFF_STATE,
    ...Object.fromEntries(Object.entries(persisted).map(([id, v]) => [id, v.on])),
  }));

  const [confirmed, setConfirmed] = useState(() =>
    Object.fromEntries(
      [...VALVES, ...PUMPS].map((a) => [a.id, persisted[a.id]?.confirmed ?? true])
    )
  );

  // Optimistic local state for filter mode and backwash so buttons update
  // immediately on click without waiting for a sensor packet from the Mega.
  const [localFilterMode, setLocalFilterMode] = useState(filterMode);
  const [localBackwashState, setLocalBackwashState] = useState(backwashState);

  // Sync back when the server confirms a new value.
  useEffect(() => { setLocalFilterMode(filterMode); }, [filterMode]);
  useEffect(() => { setLocalBackwashState(backwashState); }, [backwashState]);

  const pendingTimersRef = useRef({});
  const cmdDebounceRef = useRef({});
  const qaInhibitRef = useRef(new Set());

  useEffect(() => {
    setConfirmed((prev) => {
      const next = { ...prev };
      for (const [id, v] of Object.entries(persisted)) {
        if (v.confirmed && pendingTimersRef.current[id]) {
          clearTimeout(pendingTimersRef.current[id]);
          delete pendingTimersRef.current[id];
        }
        next[id] = v.confirmed;
      }
      return next;
    });
  }, [persisted]);

  const anyPending = Object.values(confirmed).some((c) => !c);
  useEffect(() => {
    if (!anyPending) return;
    const id = setInterval(() => revalidator.revalidate(), 500);
    return () => clearInterval(id);
  }, [anyPending, revalidator]);

  // SSE-driven updates: revalidate immediately when the bridge pushes a
  // hardware state change, even when no UI command is pending.
  useEffect(() => {
    return subscribeActuators(() => {
      revalidator.revalidate();
    });
  }, [subscribeActuators, revalidator]);

  const anyOn = Object.values(states).some(Boolean);

  const markPending = (ids) => {
    setConfirmed((prev) => ({
      ...prev,
      ...Object.fromEntries(ids.map((id) => [id, false])),
    }));
    ids.forEach((id) => {
      clearTimeout(pendingTimersRef.current[id]);
      pendingTimersRef.current[id] = setTimeout(() => {
        setConfirmed((prev) => (prev[id] === false ? { ...prev, [id]: true } : prev));
        delete pendingTimersRef.current[id];
      }, STALE_PENDING_MS);
    });
  };

  const handleToggle = (type, id, currentlyOn) => {
    const newState = currentlyOn ? 'OFF' : 'ON';
    setStates((prev) => ({ ...prev, [id]: newState === 'ON' }));
    clearTimeout(cmdDebounceRef.current[id]);
    cmdDebounceRef.current[id] = setTimeout(() => {
      delete cmdDebounceRef.current[id];
      markPending([id]);
      postCommands({ type, id, state: newState });
    }, CMD_DEBOUNCE_MS);
  };

  const handleQuickStart = (qa) => {
    const key = `start:${qa.id}`;
    if (qaInhibitRef.current.has(key)) return;
    qaInhibitRef.current.add(key);
    setTimeout(() => qaInhibitRef.current.delete(key), 1000);

    setStates((prev) => {
      const next = { ...prev };
      qa.affects.forEach((id) => { next[id] = true; });
      return next;
    });
    markPending(qa.affects);
    postCommands({ intent: 'quick_action', commands: JSON.stringify(qa.startCmds) });
  };

  const handleQuickStop = (qa) => {
    const key = `stop:${qa.id}`;
    if (qaInhibitRef.current.has(key)) return;
    qaInhibitRef.current.add(key);
    setTimeout(() => qaInhibitRef.current.delete(key), 1000);

    setStates((prev) => {
      const next = { ...prev };
      qa.affects.forEach((id) => { next[id] = false; });
      return next;
    });
    markPending(qa.affects);
    postCommands({ intent: 'quick_action', commands: JSON.stringify(qa.stopCmds) });
  };

  const handleEStop = () => {
    setStates(ALL_OFF_STATE);
    markPending([...VALVES, ...PUMPS].map((a) => a.id));
    postCommands({ intent: 'estop' });
  };

  const handleFilterMode = (mode) => {
    const modeNum = mode === 'CHARCOAL' ? 0 : 1;
    setLocalFilterMode(modeNum);
    postCommands({ intent: 'set_filter_mode', mode });
  };

  const handleBackwash = (action) => {
    setLocalBackwashState(action === 'START' ? 1 : 0);
    postCommands({ intent: 'backwash', action });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Actuators</h2>
          <p className="text-sm text-muted-foreground">
            Manual control of valves and pumps. Use for calibration and maintenance only.
          </p>
        </div>
        <Button variant="destructive" size="lg" className="shrink-0 gap-2" onClick={handleEStop}>
          <Power className="h-5 w-5" />
          All Off (E-Stop)
        </Button>
      </div>

      <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
          <div className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
            <p className="font-semibold">Manual mode — state machine is not enforced</p>
            <p>
              Commands are sent directly to actuators, bypassing the automated pipeline logic.
              <strong> Never run a pump without first confirming its upstream container has water</strong> —
              dry running damages the pump. The Mega firmware adds a 100 ms delay between
              valve-open and pump-start automatically.
            </p>
          </div>
        </CardContent>
      </Card>

      {anyOn && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 dark:border-amber-800 dark:bg-amber-950/20">
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Currently on:</span>
          {Object.entries(states).filter(([, on]) => on).map(([id]) => (
            <Badge key={id} className="bg-amber-500 text-white">{id}</Badge>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4 text-primary" />
            Filter Mode
          </CardTitle>
          <CardDescription>
            Sets the treatment path on the Mega. Charcoal Only sends water straight to C6 after the
            charcoal filter; Charcoal + RO adds the commercial RO stage before C6.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button variant={localFilterMode === 0 ? 'default' : 'outline'} className="gap-2" onClick={() => handleFilterMode('CHARCOAL')}>
              <Filter className="h-4 w-4" />
              Charcoal Only
            </Button>
            <Button variant={localFilterMode === 1 ? 'default' : 'outline'} className="gap-2" onClick={() => handleFilterMode('BOTH')}>
              <Filter className="h-4 w-4" />
              Charcoal + RO
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Backwash</span>
              {localBackwashState === 1 && <Badge className="bg-amber-500 text-white text-xs">Running</Badge>}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" className="gap-2" disabled={localBackwashState === 1} onClick={() => handleBackwash('START')}>
                <PlayCircle className="h-4 w-4" />
                Start Backwash
              </Button>
              <Button variant={localBackwashState === 1 ? 'destructive' : 'outline'} size="sm" className="gap-2" disabled={localBackwashState === 0} onClick={() => handleBackwash('STOP')}>
                <StopCircle className="h-4 w-4" />
                Stop Backwash
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="manual" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual Controls</TabsTrigger>
          <TabsTrigger value="quick">Quick Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Solenoid Valves</h3>
              <Badge variant="outline" className="text-xs">Normally Closed</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {VALVES.map((valve) => (
                <ActuatorCard
                  key={valve.id}
                  actuator={valve}
                  isOn={states[valve.id]}
                  isValve={true}
                  isConfirmed={confirmed[valve.id]}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Pumps</h3>
              <Badge variant="outline" className="border-amber-300 text-xs text-amber-600 dark:text-amber-400">
                Dry-run risk
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {PUMPS.map((pump) => (
                <ActuatorCard
                  key={pump.id}
                  actuator={pump}
                  isOn={states[pump.id]}
                  isValve={false}
                  isConfirmed={confirmed[pump.id]}
                  onToggle={handleToggle}
                />
              ))}
            </div>

            <div className="flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>
                Always open the upstream valve before starting a pump. The Mega adds a 100 ms
                safety delay automatically, but verify water is present first.
              </span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="quick" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Predefined sequences for common calibration tasks. Each action opens the correct valves
            and starts the right pump in the correct order. Press Stop when the container reaches
            the desired level.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_ACTIONS.map((qa) => (
              <QuickActionCard
                key={qa.id}
                action={qa}
                activeStates={states}
                onStart={handleQuickStart}
                onStop={handleQuickStop}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
