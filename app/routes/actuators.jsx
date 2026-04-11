/**
 * Actuators Page — Manual Pump & Valve Control
 *
 * Sends C,VALVE,Vn,ON/OFF and C,PUMP,Pn,ON/OFF commands through the
 * existing /api/commands pipeline (MongoDB → ESP32 poll → Mega UART).
 *
 * State is optimistic: the UI reflects what was commanded, not confirmed
 * ACKs from the Mega. Do not use this page during automated pipeline runs.
 */

import { json } from '@remix-run/node';
import { useLoaderData, useRevalidator } from '@remix-run/react';
import { useState, useEffect } from 'react';
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
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Hardware definitions (mirrors pins.h)
// ---------------------------------------------------------------------------

const VALVES = [
  {
    id: 'V1',
    label: 'V1',
    route: 'C1 → C2',
    description: 'Pass-through after first flush',
  },
  {
    id: 'V2',
    label: 'V2',
    route: 'C2 → Filter',
    description: 'Charcoal filter intake',
  },
  {
    id: 'V3',
    label: 'V3',
    route: 'Filter → C6',
    description: 'Direct bypass — skips RO',
  },
  {
    id: 'V4',
    label: 'V4',
    route: 'Filter → C4',
    description: 'To commercial RO path',
  },
  {
    id: 'V5',
    label: 'V5',
    route: 'Filter Drain',
    description: 'Backwash drain outlet',
  },
  {
    id: 'V6',
    label: 'V6',
    route: 'C5 → C4',
    description: 'Feedback / recycle path',
  },
  {
    id: 'V7',
    label: 'V7',
    route: 'C5 → C6',
    description: 'Good water pass-through',
  },
  {
    id: 'V8',
    label: 'V8',
    route: 'First Flush',
    description: 'Routes initial rain to drain',
  },
];

const PUMPS = [
  {
    id: 'P1',
    label: 'P1',
    route: 'C2 → Filter',
    description: 'Buffer tank to charcoal filter',
  },
  {
    id: 'P2',
    label: 'P2',
    route: 'C4 → RO',
    description: 'Pre-RO buffer to commercial RO',
  },
  {
    id: 'P3',
    label: 'P3',
    route: 'C5 Output',
    description: 'C5 to C6 or feedback path',
  },
  {
    id: 'P4',
    label: 'P4',
    route: 'C5 → C4 Recycle',
    description: 'Feedback booster pump',
  },
];

// Preset sequences for common calibration tasks.
// stopCmds deliberately sends pump OFF before valve OFF to prevent water hammer.
const QUICK_ACTIONS = [
  {
    id: 'fill_c2',
    label: 'Fill C2 (Buffer Tank)',
    description:
      'Opens V1 so water flows from C1 into C2. No pump needed — gravity fed.',
    affects: ['V1'],
    startCmds: [{ type: 'VALVE', id: 'V1', state: 'ON' }],
    stopCmds: [{ type: 'VALVE', id: 'V1', state: 'OFF' }],
    note: 'Ensure Container 1 has water before opening.',
  },
  {
    id: 'fill_c3_filter',
    label: 'Fill C3 — Charcoal Filter',
    description:
      'Opens V2 then starts P1 to pump from C2 into the charcoal filter body.',
    affects: ['V2', 'P1'],
    startCmds: [
      { type: 'VALVE', id: 'V2', state: 'ON' },
      { type: 'PUMP', id: 'P1', state: 'ON' },
    ],
    stopCmds: [
      { type: 'PUMP', id: 'P1', state: 'OFF' },
      { type: 'VALVE', id: 'V2', state: 'OFF' },
    ],
    note: 'C2 must have water. P1 must not run dry — stop immediately if C2 empties.',
  },
  {
    id: 'fill_c4',
    label: 'Fill C4 (Pre-RO Buffer)',
    description:
      'Opens V2 + V4 and starts P1 to push water through the charcoal filter into C4.',
    affects: ['V2', 'V4', 'P1'],
    startCmds: [
      { type: 'VALVE', id: 'V2', state: 'ON' },
      { type: 'VALVE', id: 'V4', state: 'ON' },
      { type: 'PUMP', id: 'P1', state: 'ON' },
    ],
    stopCmds: [
      { type: 'PUMP', id: 'P1', state: 'OFF' },
      { type: 'VALVE', id: 'V4', state: 'OFF' },
      { type: 'VALVE', id: 'V2', state: 'OFF' },
    ],
    note: 'C2 must have water. Stop immediately when C4 reaches target level.',
  },
  {
    id: 'fill_c5_from_c4',
    label: 'Fill C5 (Quality Check Tank)',
    description:
      'Starts P2 to push water from C4 through the RO filter into C5.',
    affects: ['P2'],
    startCmds: [{ type: 'PUMP', id: 'P2', state: 'ON' }],
    stopCmds: [{ type: 'PUMP', id: 'P2', state: 'OFF' }],
    note: 'C4 must have water. RO membranes require adequate feed pressure.',
  },
  {
    id: 'fill_c6_direct',
    label: 'Fill C6 Direct (Bypass RO)',
    description:
      'Opens V2 + V3 and starts P1 to push water from C2 through the charcoal filter directly into C6, skipping RO.',
    affects: ['V2', 'V3', 'P1'],
    startCmds: [
      { type: 'VALVE', id: 'V2', state: 'ON' },
      { type: 'VALVE', id: 'V3', state: 'ON' },
      { type: 'PUMP', id: 'P1', state: 'ON' },
    ],
    stopCmds: [
      { type: 'PUMP', id: 'P1', state: 'OFF' },
      { type: 'VALVE', id: 'V3', state: 'OFF' },
      { type: 'VALVE', id: 'V2', state: 'OFF' },
    ],
    note: 'Water bypasses RO — use only for level calibration, not potability testing.',
  },
  {
    id: 'drain_filter',
    label: 'Drain Charcoal Filter (V5)',
    description:
      'Opens V5 to drain the filter body to waste. Used before backwash or maintenance.',
    affects: ['V5'],
    startCmds: [{ type: 'VALVE', id: 'V5', state: 'ON' }],
    stopCmds: [{ type: 'VALVE', id: 'V5', state: 'OFF' }],
    note: null,
  },
];

// Default actuator state — all off
const ALL_OFF_STATE = Object.fromEntries(
  [...VALVES, ...PUMPS].map((a) => [a.id, false])
);

// ---------------------------------------------------------------------------
// Remix meta
// ---------------------------------------------------------------------------

export const meta = () => [
  { title: 'Actuators | RainWater Monitoring System' },
];

// ---------------------------------------------------------------------------
// Remix loader — reads persisted actuator state from MongoDB
// ---------------------------------------------------------------------------

export const loader = async ({ request }) => {
  const { requireOperator } = await import('~/lib/auth.server');
  await requireOperator(request);

  const { getDb } = await import('~/lib/db.server');
  const db  = await getDb();
  const docs = await db.collection('actuator_states').find({}).toArray();

  // { V1: { on: true, confirmed: false }, ... }
  const persisted = Object.fromEntries(
    docs.map((d) => [d.actuatorId, { on: d.state === 'ON', confirmed: d.confirmed ?? true }])
  );

  return json({ persisted });
};

// ---------------------------------------------------------------------------
// Remix action
// ---------------------------------------------------------------------------

// Persist a list of { type, id, state } commands to MongoDB
async function persistStates(commands) {
  const { getDb } = await import('~/lib/db.server');
  const db = await getDb();
  await Promise.all(
    commands.map(({ type, id, state }) =>
      db.collection('actuator_states').updateOne(
        { actuatorId: id },
        { $set: { actuatorId: id, type, state, confirmed: false, updatedAt: new Date() } },
        { upsert: true }
      )
    )
  );
}

export const action = async ({ request }) => {
  const { requireOperator } = await import('~/lib/auth.server');
  await requireOperator(request);

  const formData = await request.formData();
  const intent   = formData.get('intent');

  const { mqttPublish } = await import('~/lib/hivemq.server');

  let cmdLines  = [];
  let toPersist = [];

  if (intent === 'estop') {
    cmdLines  = ['C,ESTOP,ON'];
    // Mark every actuator OFF
    toPersist = [
      ...VALVES.map((v) => ({ type: 'VALVE', id: v.id, state: 'OFF' })),
      ...PUMPS.map((p)  => ({ type: 'PUMP',  id: p.id, state: 'OFF' })),
    ];
  } else if (intent === 'quick_action') {
    const commands = JSON.parse(formData.get('commands'));
    cmdLines  = commands.map(({ type, id, state }) => `C,${type},${id},${state}`);
    toPersist = commands;
  } else {
    const type  = formData.get('type');
    const id    = formData.get('id');
    const state = formData.get('state');
    cmdLines  = [`C,${type},${id},${state}`];
    toPersist = [{ type, id, state }];
  }

  await Promise.all([
    mqttPublish('rainwater/commands', cmdLines),
    persistStates(toPersist),
  ]);

  return json({ ok: true, published: cmdLines });
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ActuatorCard({ actuator, isOn, isValve, isConfirmed, onToggle }) {
  const { id, label, route, description } = actuator;
  const isPending = !isConfirmed;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border p-4 transition-all',
        isOn
          ? isValve
            ? 'border-blue-400 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30'
            : 'border-green-400 bg-green-50 dark:border-green-700 dark:bg-green-950/30'
          : 'border-border bg-muted/20',
        isPending && 'opacity-70'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {isValve ? (
            <Droplets
              className={cn(
                'h-4 w-4',
                isOn ? 'text-blue-500' : 'text-muted-foreground',
                isPending && 'animate-pulse'
              )}
            />
          ) : (
            <Zap
              className={cn(
                'h-4 w-4',
                isOn ? 'text-green-500' : 'text-muted-foreground',
                isPending && 'animate-pulse'
              )}
            />
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
                ? isValve
                  ? 'border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'border-green-400 text-green-600 dark:text-green-400'
                : 'text-muted-foreground'
          )}
        >
          {isPending ? 'PENDING' : isOn ? (isValve ? 'OPEN' : 'ON') : (isValve ? 'CLOSED' : 'OFF')}
        </Badge>
      </div>

      {/* Route label */}
      <div className="flex items-center gap-1.5 text-sm font-medium">
        {route.split(' → ').map((part, i, arr) => (
          <span key={i} className="flex items-center gap-1.5">
            <span
              className={cn(
                isOn
                  ? isValve
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-green-700 dark:text-green-300'
                  : 'text-foreground'
              )}
            >
              {part}
            </span>
            {i < arr.length - 1 && (
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            )}
          </span>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{description}</p>

      {/* Toggle button */}
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
  // A quick action is "running" if any of its affected actuators are on
  const isRunning = qa.affects.some((id) => activeStates[id]);

  return (
    <Card
      className={cn(
        'transition-all',
        isRunning && 'border-amber-400 dark:border-amber-600'
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{qa.label}</CardTitle>
          {isRunning && (
            <Badge className="flex-shrink-0 bg-amber-500 text-white">
              Running
            </Badge>
          )}
        </div>
        <CardDescription>{qa.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Affects badges */}
        <div className="flex flex-wrap gap-1.5">
          {qa.affects.map((id) => (
            <Badge
              key={id}
              variant="outline"
              className={cn(
                'text-xs',
                activeStates[id] &&
                  'border-amber-400 text-amber-600 dark:text-amber-400'
              )}
            >
              {id}
            </Badge>
          ))}
        </div>

        {/* Note */}
        {qa.note && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            {qa.note}
          </div>
        )}

        {/* Start / Stop */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => onStart(qa)}
          >
            <PlayCircle className="h-4 w-4" />
            Start
          </Button>
          <Button
            size="sm"
            variant={isRunning ? 'destructive' : 'outline'}
            className="flex-1 gap-2"
            onClick={() => onStop(qa)}
          >
            <StopCircle className="h-4 w-4" />
            Stop
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

// Fire-and-forget POST to the Remix action. Each call is independent —
// no request cancels another, so rapid clicks all reach the server.
function postCommands(body) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(body)) fd.append(k, v);
  fetch(window.location.pathname, { method: 'POST', body: fd }).catch(() => {});
}

export default function ActuatorsPage() {
  const { persisted }  = useLoaderData();
  const revalidator    = useRevalidator();

  // on/off state — seeded from MongoDB, updated optimistically on click
  const [states, setStates] = useState(() =>
    Object.fromEntries(
      Object.entries({ ...ALL_OFF_STATE, ...Object.fromEntries(
        Object.entries(persisted).map(([id, v]) => [id, v.on])
      )})
    )
  );

  // confirmed map — true = ACKed by Mega, false = pending
  const [confirmed, setConfirmed] = useState(() =>
    Object.fromEntries(
      [...VALVES, ...PUMPS].map((a) => [
        a.id,
        persisted[a.id]?.confirmed ?? true,
      ])
    )
  );

  // Sync confirmed status whenever loader data refreshes
  useEffect(() => {
    setConfirmed((prev) => {
      const next = { ...prev };
      for (const [id, v] of Object.entries(persisted)) {
        next[id] = v.confirmed;
      }
      return next;
    });
  }, [persisted]);

  // Poll every 2s while any actuator is unconfirmed
  const anyPending = Object.values(confirmed).some((c) => !c);
  useEffect(() => {
    if (!anyPending) return;
    const id = setInterval(() => revalidator.revalidate(), 2000);
    return () => clearInterval(id);
  }, [anyPending, revalidator]);

  const anyOn = Object.values(states).some(Boolean);

  const markPending = (ids) =>
    setConfirmed((prev) => ({ ...prev, ...Object.fromEntries(ids.map((id) => [id, false])) }));

  // Single actuator toggle — UI updates instantly, POST fires immediately
  const handleToggle = (type, id, currentlyOn) => {
    const newState = currentlyOn ? 'OFF' : 'ON';
    setStates((prev) => ({ ...prev, [id]: newState === 'ON' }));
    markPending([id]);
    postCommands({ type, id, state: newState });
  };

  // Quick action start
  const handleQuickStart = (qa) => {
    setStates((prev) => {
      const next = { ...prev };
      qa.affects.forEach((id) => { next[id] = true; });
      return next;
    });
    markPending(qa.affects);
    postCommands({ intent: 'quick_action', commands: JSON.stringify(qa.startCmds) });
  };

  // Quick action stop
  const handleQuickStop = (qa) => {
    setStates((prev) => {
      const next = { ...prev };
      qa.affects.forEach((id) => { next[id] = false; });
      return next;
    });
    markPending(qa.affects);
    postCommands({ intent: 'quick_action', commands: JSON.stringify(qa.stopCmds) });
  };

  // Emergency stop
  const handleEStop = () => {
    setStates(ALL_OFF_STATE);
    markPending([...VALVES, ...PUMPS].map((a) => a.id));
    postCommands({ intent: 'estop' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Actuators
          </h1>
          <p className="text-muted-foreground">
            Manual control of valves and pumps. Use for calibration and
            maintenance only.
          </p>
        </div>

        {/* All Off button — always visible */}
        <Button
          variant="destructive"
          size="lg"
          className="shrink-0 gap-2"
          onClick={handleEStop}
        >
          <Power className="h-5 w-5" />
          All Off (E-Stop)
        </Button>
      </div>

      {/* Safety warning */}
      <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
          <div className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
            <p className="font-semibold">
              Manual mode — state machine is not enforced
            </p>
            <p>
              Commands are sent directly to actuators, bypassing the automated
              pipeline logic.
              <strong>
                {' '}
                Never run a pump without first confirming its upstream container
                has water
              </strong>{' '}
              — dry running damages the pump. The Mega firmware adds a 100 ms
              delay between valve-open and pump-start automatically.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Active actuators summary */}
      {anyOn && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 dark:border-amber-800 dark:bg-amber-950/20">
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
            Currently on:
          </span>
          {Object.entries(states)
            .filter(([, on]) => on)
            .map(([id]) => (
              <Badge key={id} className="bg-amber-500 text-white">
                {id}
              </Badge>
            ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="manual" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual Controls</TabsTrigger>
          <TabsTrigger value="quick">Quick Actions</TabsTrigger>
        </TabsList>

        {/* Manual Controls */}
        <TabsContent value="manual" className="space-y-6">
          {/* Valves */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-semibold">Solenoid Valves</h2>
              <Badge variant="outline" className="text-xs">
                Normally Closed
              </Badge>
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

          {/* Pumps */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-500" />
              <h2 className="text-lg font-semibold">Pumps</h2>
              <Badge
                variant="outline"
                className="border-amber-300 text-xs text-amber-600 dark:text-amber-400"
              >
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

            {/* Pump dry-run reminder */}
            <div className="flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>
                Always open the upstream valve before starting a pump. The Mega
                adds a 100 ms safety delay automatically, but verify water is
                present first.
              </span>
            </div>
          </div>
        </TabsContent>

        {/* Quick Actions */}
        <TabsContent value="quick" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Predefined sequences for common calibration tasks. Each action opens
            the correct valves and starts the right pump in the correct order.
            Press Stop when the container reaches the desired level.
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
