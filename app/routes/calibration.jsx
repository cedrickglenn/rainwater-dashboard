/**
 * Calibration Page
 * Wireless sensor calibration via the ESP32 bridge.
 * Commands are queued to the backend, picked up by the ESP32,
 * forwarded to the Arduino Mega, and ACKed back.
 */

import { json } from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '~/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Separator } from '~/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {
  Droplets,
  Eye,
  Thermometer,
  Waves,
  Wind,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  FlaskConical,
  Loader2,
  DatabaseZap,
} from 'lucide-react';
import { SerialMonitor } from '~/components/dashboard/serial-monitor';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PH_CONTAINERS = ['C2', 'C5', 'C6'];
const TURB_CONTAINERS = ['C2', 'C5', 'C6'];
const TEMP_CONTAINERS = ['C2', 'C5', 'C6'];
const LEVEL_CONTAINERS = ['C2', 'C3', 'C4', 'C5', 'C6'];

const CONTAINER_LABELS = {
  C2: 'C2 — Raw Collection',
  C3: 'C3 — First Flush',
  C4: 'C4 — Pre-filter',
  C5: 'C5 — Post-filter',
  C6: 'C6 — Clean Storage',
};

// ---------------------------------------------------------------------------
// Remix meta
// ---------------------------------------------------------------------------

export const meta = () => [
  { title: 'Calibration | RainWater Monitoring System' },
  {
    name: 'description',
    content: 'Wireless sensor calibration via ESP32 bridge',
  },
];

// ---------------------------------------------------------------------------
// Remix loader — swap in real API calls when backend is live
// ---------------------------------------------------------------------------

export const loader = async ({ request }) => {
  const { requireAdmin } = await import('~/lib/auth.server');
  await requireAdmin(request);
  return json({ acks: [], calState: null });
};

// ---------------------------------------------------------------------------
// Remix action — receives form POSTs and forwards to Express backend
// ---------------------------------------------------------------------------

export const action = async ({ request }) => {
  const { requireAdmin } = await import('~/lib/auth.server');
  await requireAdmin(request);

  const formData = await request.formData();
  const command = formData.get('command');
  const container = formData.get('container');
  const point = formData.get('point');
  const value = formData.get('value');

  let cmdLine = `C,${command},${container}`;
  if (point && point !== '') cmdLine += `,${point}`;
  if (value && value !== '') cmdLine += `,${value}`;

  const { mqttPublish } = await import('~/lib/hivemq.server');
  await mqttPublish('rainwater/calibration/commands', cmdLine);

  return json({ ok: true, queued: cmdLine });
};

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function CalSection({ icon: Icon, title, description, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// ACK polling hook
// After the dashboard action returns { ok, queued }, we poll
// GET /api/calibration/acks until a matching ACK arrives or 15s elapses.
//
// The Mega ACK format is: A,<COMMAND>,<CONTAINER>,<POINT>,<OK|ERR>,<value?>
// e.g.  A,CAL_LVL,C4,EMPTY,OK,42.3
//       A,CAL_PH,C2,MID,OK,2530.00
//       A,CAL_RESET,OK          (no container/point)
// ---------------------------------------------------------------------------

const ACK_POLL_MS   = 1000;
const ACK_TIMEOUT_MS = 15000;

// Derive the ACK prefix to match against the raw ACK string.
// Most commands: C,CAL_LVL,C4,EMPTY  → A,CAL_LVL,C4,EMPTY
// CAL_RESET special case: Mega ACKs as A,CAL_RESET,OK (not A,CAL_RESET,ALL)
function ackPrefixFor(cmdLine) {
  if (!cmdLine) return null;
  if (cmdLine.startsWith('C,CAL_RESET,')) return 'A,CAL_RESET,OK';
  return 'A,' + cmdLine.slice(2);
}

function useAckPoller(fetcherData) {
  const [ackState, setAckState] = useState(null); // null | 'waiting' | { ok, message }
  const timerRef  = useRef(null);
  const startRef  = useRef(null);
  const prefixRef = useRef(null);

  useEffect(() => {
    if (!fetcherData?.ok || !fetcherData?.queued) return;

    const prefix = ackPrefixFor(fetcherData.queued);
    if (!prefix) return;

    // Reset for each new submission
    prefixRef.current = prefix;
    startRef.current  = Date.now();
    setAckState('waiting');
    clearInterval(timerRef.current);

    timerRef.current = setInterval(async () => {
      if (Date.now() - startRef.current > ACK_TIMEOUT_MS) {
        clearInterval(timerRef.current);
        setAckState({ ok: false, message: 'No ACK from device after 15 s — check serial connection.' });
        return;
      }

      try {
        const res = await fetch('/api/calibration/acks');
        if (!res.ok) return;
        const { acks } = await res.json();

        // Only match ACKs that arrived after this submission started,
        // so stale ACKs from previous calibration sessions don't fire immediately.
        const submittedAt = startRef.current;
        const match = acks.find(
          a => a.raw &&
               a.raw.startsWith(prefixRef.current) &&
               new Date(a.timestamp).getTime() >= submittedAt
        );
        if (!match) return;

        clearInterval(timerRef.current);

        if (match.status === 'OK') {
          // Build a human-readable message from the parsed fields
          const parts = [match.command, match.container, match.point]
            .filter(Boolean).join(' · ');
          const valuePart = match.value != null ? ` → ${match.value}` : '';
          setAckState({ ok: true, message: `${parts}${valuePart} — applied & saved to EEPROM` });
        } else {
          setAckState({ ok: false, message: `Device rejected command: ${match.raw ?? 'ERR'}` });
        }
      } catch {
        // network blip — keep polling
      }
    }, ACK_POLL_MS);

    return () => clearInterval(timerRef.current);
  }, [fetcherData]);

  return ackState;
}

// ---------------------------------------------------------------------------
// AckStatus — shows queued → waiting → device ACK result
// ---------------------------------------------------------------------------

function AckStatus({ fetcherData, submitting }) {
  const ackState = useAckPoller(fetcherData);

  if (submitting) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
        <span className="font-mono text-xs">Sending command…</span>
      </div>
    );
  }

  if (ackState === 'waiting') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
        <span className="font-mono text-xs">Waiting for device ACK…</span>
      </div>
    );
  }

  if (ackState && typeof ackState === 'object') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
          ackState.ok
            ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400'
            : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
        )}
      >
        {ackState.ok ? (
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
        ) : (
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
        )}
        <span className="font-mono text-xs">{ackState.message}</span>
      </div>
    );
  }

  if (fetcherData && !fetcherData.ok) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <span className="font-mono text-xs">{fetcherData.error ?? 'Failed to send command'}</span>
      </div>
    );
  }

  return null;
}

function Step({ number, text }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {number}
      </span>
      <p className="pt-0.5 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function ContainerSelect({ containers, value, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <Label className="w-24 flex-shrink-0">Container</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {containers.map((c) => (
            <SelectItem key={c} value={c}>
              {CONTAINER_LABELS[c]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LiveReading — polls /api/sensors/latest every 2 s and shows the current
// value for a given sensor key inline within the calibration card.
// Mobile-first: single flex row, no fixed widths, wraps gracefully.
// ---------------------------------------------------------------------------

function LiveReading({
  sensorKey,
  label,
  unit,
  decimals = 1,
  rawKey = null,
  rawUnit = null,
  rawDecimals = 1,
  rawTransform = null,
}) {
  const [calValue, setCalValue] = useState(null);
  const [rawValue, setRawValue] = useState(null);
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch('/api/sensors/latest');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const cal = data[sensorKey];
        setCalValue(cal != null ? Number(cal).toFixed(decimals) : null);
        if (rawKey) {
          const raw = data[rawKey];
          const transformed = raw != null ? (rawTransform ? rawTransform(Number(raw)) : Number(raw)) : null;
          setRawValue(transformed != null ? transformed.toFixed(rawDecimals) : null);
        }
        setFlash(true);
        clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(false), 400);
      } catch {
        // silently ignore — hardware may not be connected
      }
    }

    poll();
    const id = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
      clearTimeout(flashTimer.current);
    };
  }, [sensorKey, decimals, rawKey, rawDecimals, rawTransform]);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border bg-muted/30 px-3 py-2">
      {/* Pulsing live dot */}
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>

      {/* Calibrated value */}
      <span className="flex items-baseline gap-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span
          className={cn(
            'font-mono text-sm font-semibold transition-colors duration-300',
            flash ? 'text-green-600 dark:text-green-400' : 'text-foreground'
          )}
        >
          {calValue != null ? `${calValue}${unit ? ` ${unit}` : ''}` : '—'}
        </span>
      </span>

      {/* Raw value — only rendered when rawKey is provided */}
      {rawKey && (
        <>
          <span className="text-xs text-muted-foreground/50">·</span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-xs text-muted-foreground">raw</span>
            <span
              className={cn(
                'font-mono text-xs transition-colors duration-300',
                flash
                  ? 'text-green-600/70 dark:text-green-400/70'
                  : 'text-muted-foreground'
              )}
            >
              {rawValue != null
                ? `${rawValue}${rawUnit ? ` ${rawUnit}` : ''}`
                : '—'}
            </span>
          </span>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// pH tab
// ---------------------------------------------------------------------------

function PHTab() {
  const fetcher = useFetcher();
  const [container, setContainer] = useState('C2');
  const submitting = fetcher.state === 'submitting';

  return (
    <CalSection
      icon={Droplets}
      title="pH Sensor Calibration"
      description="2-point calibration using pH 7.00 and pH 4.01 buffer solutions. Each container (C2, C5, C6) is calibrated independently."
    >
      <ContainerSelect
        containers={PH_CONTAINERS}
        value={container}
        onChange={setContainer}
      />
      <LiveReading
        sensorKey={`PH_${container}`}
        label="pH"
        unit="pH"
        decimals={2}
        rawKey={`RAW_MV_${container}`}
        rawUnit="mV"
        rawDecimals={0}
      />

      <Separator />

      {/* Mid point */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Step 1 — Mid Point (pH 7.00)</p>
        <div className="space-y-2 pl-1">
          <Step
            number="1"
            text="Rinse the probe with distilled water and dry gently."
          />
          <Step
            number="2"
            text="Submerge the probe in pH 7.00 buffer solution."
          />
          <Step number="3" text="Wait ~60 s for the voltage to stabilize." />
          <Step
            number="4"
            text="Press Capture — the Mega reads the current ADC voltage as the neutral point and saves to EEPROM."
          />
        </div>
        <fetcher.Form method="post">
          <input type="hidden" name="command" value="CAL_PH" />
          <input type="hidden" name="container" value={container} />
          <input type="hidden" name="point" value="MID" />
          <Button
            type="submit"
            variant="outline"
            disabled={submitting}
            className="gap-2"
          >
            <FlaskConical className="h-4 w-4" />
            {submitting ? 'Sending…' : `Capture pH 7.00 — ${container}`}
          </Button>
        </fetcher.Form>
      </div>

      <Separator />

      {/* Low point */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Step 2 — Low Point (pH 4.01)</p>
        <div className="space-y-2 pl-1">
          <Step
            number="1"
            text="Rinse the probe with distilled water and dry gently."
          />
          <Step
            number="2"
            text="Submerge the probe in pH 4.01 buffer solution."
          />
          <Step number="3" text="Wait ~60 s for the voltage to stabilize." />
          <Step
            number="4"
            text="Press Capture — the Mega reads the ADC voltage as the acid point and saves to EEPROM."
          />
        </div>
        <fetcher.Form method="post">
          <input type="hidden" name="command" value="CAL_PH" />
          <input type="hidden" name="container" value={container} />
          <input type="hidden" name="point" value="LOW" />
          <Button
            type="submit"
            variant="outline"
            disabled={submitting}
            className="gap-2"
          >
            <FlaskConical className="h-4 w-4" />
            {submitting ? 'Sending…' : `Capture pH 4.01 — ${container}`}
          </Button>
        </fetcher.Form>
      </div>

      <AckStatus fetcherData={fetcher.data} submitting={submitting} />
    </CalSection>
  );
}

// ---------------------------------------------------------------------------
// Turbidity tab
// ---------------------------------------------------------------------------

function TurbidityTab() {
  const fetcher = useFetcher();
  const [container, setContainer] = useState('C2');
  const [spanNTU, setSpanNTU] = useState('10');
  const submitting = fetcher.state === 'submitting';

  return (
    <CalSection
      icon={Eye}
      title="Turbidity Sensor Calibration"
      description="2-point calibration using distilled water (0 NTU) and a known turbidity standard."
    >
      <ContainerSelect
        containers={TURB_CONTAINERS}
        value={container}
        onChange={setContainer}
      />
      <LiveReading
        sensorKey={`TURB_${container}`}
        label="Turbidity"
        unit="NTU"
        decimals={1}
        rawKey={`RAW_TURB_V_${container}`}
        rawUnit="mV"
        rawDecimals={0}
        rawTransform={(v) => v * 1000}
      />

      <Separator />

      {/* Zero */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Step 1 — Zero Point (0 NTU)</p>
        <div className="space-y-2 pl-1">
          <Step number="1" text="Clean the sensor and container." />
          <Step
            number="2"
            text="Fill with distilled water — this is your 0 NTU reference."
          />
          <Step
            number="3"
            text="Submerge the sensor, wait for a stable reading, then press Set Zero."
          />
        </div>
        <fetcher.Form method="post">
          <input type="hidden" name="command" value="CAL_TURB" />
          <input type="hidden" name="container" value={container} />
          <input type="hidden" name="point" value="ZERO" />
          <Button
            type="submit"
            variant="outline"
            disabled={submitting}
            className="gap-2"
          >
            <FlaskConical className="h-4 w-4" />
            {submitting ? 'Sending…' : `Set Zero (0 NTU) — ${container}`}
          </Button>
        </fetcher.Form>
      </div>

      <Separator />

      {/* Span */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Step 2 — Span Point (known NTU)</p>
        <div className="space-y-2 pl-1">
          <Step
            number="1"
            text="Prepare a turbidity standard (e.g., diluted formazin or a powdered-milk solution with a known NTU value)."
          />
          <Step
            number="2"
            text="Submerge the sensor, wait for a stable reading."
          />
          <Step
            number="3"
            text="Enter the NTU value of your standard below, then press Set Span."
          />
        </div>
        <div className="flex items-center gap-3">
          <Label className="flex-shrink-0">Standard NTU value</Label>
          <input
            type="number"
            step="0.1"
            min="1"
            value={spanNTU}
            onChange={(e) => setSpanNTU(e.target.value)}
            className="w-24 rounded-md border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <fetcher.Form method="post">
          <input type="hidden" name="command" value="CAL_TURB" />
          <input type="hidden" name="container" value={container} />
          <input type="hidden" name="point" value="SPAN" />
          <input type="hidden" name="value" value={spanNTU} />
          <Button
            type="submit"
            variant="outline"
            disabled={submitting}
            className="gap-2"
          >
            <FlaskConical className="h-4 w-4" />
            {submitting
              ? 'Sending…'
              : `Set Span (${spanNTU} NTU) — ${container}`}
          </Button>
        </fetcher.Form>
      </div>

      <AckStatus fetcherData={fetcher.data} submitting={submitting} />
    </CalSection>
  );
}

// ---------------------------------------------------------------------------
// Level tab
// ---------------------------------------------------------------------------

function LevelTab() {
  const fetcher = useFetcher();
  const [container, setContainer] = useState('C2');
  const submitting = fetcher.state === 'submitting';

  return (
    <CalSection
      icon={Waves}
      title="Water Level Calibration"
      description="Set the empty and full reference distances for each container's ultrasonic sensor. Values are stored in EEPROM and used to convert distance → percentage fill."
    >
      <ContainerSelect
        containers={LEVEL_CONTAINERS}
        value={container}
        onChange={setContainer}
      />
      <LiveReading
        sensorKey={`LVL_${container}`}
        label="Fill"
        unit="%"
        decimals={1}
        rawKey={`RAW_DIST_${container}`}
        rawUnit="cm"
        rawDecimals={1}
      />

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Empty */}
        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-sm font-medium">Empty Reference</p>
          <p className="text-xs text-muted-foreground">
            Make sure the container is completely empty. The sensor captures its
            current distance as the 0% reference.
          </p>
          <fetcher.Form method="post">
            <input type="hidden" name="command" value="CAL_LVL" />
            <input type="hidden" name="container" value={container} />
            <input type="hidden" name="point" value="EMPTY" />
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? 'Sending…' : 'Set Empty Distance'}
            </Button>
          </fetcher.Form>
        </div>

        {/* Full */}
        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-sm font-medium">Full Reference</p>
          <p className="text-xs text-muted-foreground">
            Fill the container to its maximum designed capacity. The sensor
            captures its current distance as the 100% reference.
          </p>
          <fetcher.Form method="post">
            <input type="hidden" name="command" value="CAL_LVL" />
            <input type="hidden" name="container" value={container} />
            <input type="hidden" name="point" value="FULL" />
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? 'Sending…' : 'Set Full Distance'}
            </Button>
          </fetcher.Form>
        </div>
      </div>

      <AckStatus fetcherData={fetcher.data} submitting={submitting} />
    </CalSection>
  );
}

// ---------------------------------------------------------------------------
// Temperature tab
// ---------------------------------------------------------------------------

function TemperatureTab() {
  const fetcher = useFetcher();
  const [container, setContainer] = useState('C2');
  const [offset, setOffset] = useState('0');
  const submitting = fetcher.state === 'submitting';

  return (
    <CalSection
      icon={Thermometer}
      title="Temperature Offset"
      description="DS18B20 sensors are accurate to ±0.5 °C. Apply a small per-container offset if your reference thermometer shows a consistent difference."
    >
      <ContainerSelect
        containers={TEMP_CONTAINERS}
        value={container}
        onChange={setContainer}
      />
      <LiveReading
        sensorKey={`TEMP_${container}`}
        label="Temp"
        unit="°C"
        decimals={1}
        rawKey={`RAW_TEMP_${container}`}
        rawUnit="°C raw"
        rawDecimals={1}
      />

      <Separator />

      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Measure actual water temperature with a calibrated reference
          thermometer. Calculate:{' '}
          <strong>offset = reference − sensor reading</strong>. Example: sensor
          reads 27.5 °C, reference reads 27.0 °C → offset = −0.5.
        </p>
        <div className="flex items-center gap-3">
          <Label className="w-24 flex-shrink-0">Offset (°C)</Label>
          <input
            type="number"
            step="0.1"
            min="-5"
            max="5"
            value={offset}
            onChange={(e) => setOffset(e.target.value)}
            className="w-24 rounded-md border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <fetcher.Form method="post">
          <input type="hidden" name="command" value="CAL_TEMP" />
          <input type="hidden" name="container" value={container} />
          <input type="hidden" name="point" value="OFFSET" />
          <input type="hidden" name="value" value={offset} />
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Sending…' : `Apply Offset to ${container}`}
          </Button>
        </fetcher.Form>
      </div>

      <AckStatus fetcherData={fetcher.data} submitting={submitting} />
    </CalSection>
  );
}

// ---------------------------------------------------------------------------
// Flow tab
// ---------------------------------------------------------------------------

function FlowTab() {
  const fetcher = useFetcher();
  const [ppl, setPPL] = useState('450');
  const submitting = fetcher.state === 'submitting';

  return (
    <CalSection
      icon={Wind}
      title="Flow Sensor Calibration"
      description="Set the pulses-per-litre (PPL) factor for the YF-S201 flow meter on pin 2."
    >
      <LiveReading
        sensorKey="FLOW"
        label="Flow"
        unit="L/min"
        decimals={2}
        rawKey="RAW_FLOW_PULSES"
        rawUnit="pulses/interval"
        rawDecimals={0}
      />

      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          To measure your sensor's PPL: run exactly 1 litre of water through it
          and count the pulses in the serial monitor. Enter that count below.
          The default of 450 PPL suits YF-S201 sensors at typical low flow
          rates.
        </p>
        <div className="flex items-center gap-3">
          <Label className="flex-shrink-0">Pulses per Litre</Label>
          <input
            type="number"
            step="1"
            min="1"
            value={ppl}
            onChange={(e) => setPPL(e.target.value)}
            className="w-28 rounded-md border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        {/* container field reused as the first serial param (PPL) */}
        <fetcher.Form method="post">
          <input type="hidden" name="command" value="CAL_FLOW" />
          <input type="hidden" name="container" value="PPL" />
          <input type="hidden" name="value" value={ppl} />
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Sending…' : 'Save PPL Factor'}
          </Button>
        </fetcher.Form>
      </div>

      <AckStatus fetcherData={fetcher.data} submitting={submitting} />
    </CalSection>
  );
}

// ---------------------------------------------------------------------------
// Reset section
// ---------------------------------------------------------------------------

function ResetSection() {
  const fetcher   = useFetcher();
  const submitting = fetcher.state === 'submitting';

  return (
    <Card className="border-red-200 dark:border-red-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-red-600 dark:text-red-400">
          <RotateCcw className="h-5 w-5" />
          Reset All Calibration
        </CardTitle>
        <CardDescription>
          Resets every calibration value on the Arduino Mega to firmware
          defaults and overwrites EEPROM. This cannot be undone remotely.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <fetcher.Form method="post">
          <input type="hidden" name="command" value="CAL_RESET" />
          <input type="hidden" name="container" value="ALL" />
          <Button
            type="submit"
            variant="destructive"
            disabled={submitting}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            {submitting ? 'Sending…' : 'Reset All Calibration'}
          </Button>
        </fetcher.Form>
        <AckStatus fetcherData={fetcher.data} submitting={submitting} />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// CalibrationSummary — polls /api/calibration/acks for the last-known OK
// value per (command, container, point) and renders a compact table.
// Refreshes every 10 s and immediately after the page receives a new ACK.
// ---------------------------------------------------------------------------

const SUMMARY_GROUPS = [
  {
    label: 'Water Level',
    icon: Waves,
    rows: [
      { command: 'CAL_LVL', containers: ['C2','C3','C4','C5','C6'], point: 'EMPTY', desc: 'Empty', unit: 'cm' },
      { command: 'CAL_LVL', containers: ['C2','C3','C4','C5','C6'], point: 'FULL',  desc: 'Full',  unit: 'cm' },
    ],
  },
  {
    label: 'pH',
    icon: Droplets,
    rows: [
      { command: 'CAL_PH', containers: ['C2','C5','C6'], point: 'MID', desc: 'Neutral (pH 7)', unit: 'mV' },
      { command: 'CAL_PH', containers: ['C2','C5','C6'], point: 'LOW', desc: 'Acid (pH 4)',    unit: 'mV' },
    ],
  },
  {
    label: 'Turbidity',
    icon: Eye,
    rows: [
      { command: 'CAL_TURB', containers: ['C2','C5','C6'], point: 'ZERO', desc: 'Zero (0 NTU)', unit: 'V'   },
      { command: 'CAL_TURB', containers: ['C2','C5','C6'], point: 'SPAN', desc: 'Span',         unit: 'NTU' },
    ],
  },
  {
    label: 'Temperature',
    icon: Thermometer,
    rows: [
      { command: 'CAL_TEMP', containers: ['C2','C5','C6'], point: 'OFFSET', desc: 'Offset', unit: '°C' },
    ],
  },
  {
    label: 'Flow',
    icon: Wind,
    rows: [
      { command: 'CAL_FLOW', containers: ['PPL'], point: null, desc: 'Pulses/L', unit: 'PPL' },
    ],
  },
];

function SummaryCell({ entry }) {
  if (!entry) {
    return <span className="text-muted-foreground/40">—</span>;
  }
  const ts = new Date(entry.timestamp);
  const age = Date.now() - ts.getTime();
  const ageStr = age < 60_000
    ? 'just now'
    : age < 3_600_000
    ? `${Math.floor(age / 60_000)}m ago`
    : ts.toLocaleDateString();

  return (
    <span className="flex flex-col gap-0.5">
      <span className="font-mono text-xs font-semibold text-foreground">
        {entry.value ?? '—'} <span className="font-normal text-muted-foreground">{entry.unit}</span>
      </span>
      <span className="text-[10px] text-muted-foreground/60">{ageStr}</span>
    </span>
  );
}

function CalibrationSummary() {
  const [summary, setSummary] = useState(null); // null = loading, [] = empty

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/calibration/acks');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setSummary(data.summary ?? []);
      } catch {
        // silently ignore
      }
    }

    load();
    const id = setInterval(load, 10_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Index summary by "command|container|point" for O(1) lookup
  const index = {};
  if (summary) {
    for (const s of summary) {
      const key = `${s.command}|${s.container ?? ''}|${s.point ?? ''}`;
      index[key] = s;
    }
  }

  function lookup(command, container, point) {
    const key = `${command}|${container ?? ''}|${point ?? ''}`;
    const entry = index[key];
    if (!entry) return null;
    // Find the unit from SUMMARY_GROUPS
    let unit = '';
    for (const g of SUMMARY_GROUPS) {
      for (const r of g.rows) {
        if (r.command === command && r.point === point) { unit = r.unit; break; }
      }
    }
    return { ...entry, unit };
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <DatabaseZap className="h-5 w-5 text-primary" />
          Active Calibration Values
        </CardTitle>
        <CardDescription>
          Last values confirmed by the Mega and saved to EEPROM. Sourced from
          calibration ACKs — reflects the dashboard calibration history.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {summary === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : summary.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No calibration ACKs on record yet. Calibrate a sensor above to populate this summary.
          </p>
        ) : (
          SUMMARY_GROUPS.map(({ label, icon: Icon, rows }) => {
            // Gather all containers across this group's rows
            const allContainers = [...new Set(rows.flatMap(r => r.containers))];

            // Check if this group has any data at all — skip rendering if not
            const hasData = rows.some(r =>
              r.containers.some(c => lookup(r.command, c, r.point))
            );
            if (!hasData) return null;

            return (
              <div key={label} className="space-y-2">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {label}
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                          Point
                        </th>
                        {allContainers.map(c => (
                          <th key={c} className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ command, containers, point, desc }) => (
                        <tr key={`${command}|${point}`} className="border-b last:border-0">
                          <td className="px-3 py-2 text-xs text-muted-foreground">{desc}</td>
                          {allContainers.map(c => (
                            <td key={c} className="px-3 py-2 text-center">
                              {containers.includes(c)
                                ? <SummaryCell entry={lookup(command, c, point)} />
                                : <span className="text-muted-foreground/20 text-xs">n/a</span>
                              }
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const TABS = [
  { value: 'ph', label: 'pH', Icon: Droplets },
  { value: 'turbidity', label: 'Turbidity', Icon: Eye },
  { value: 'level', label: 'Level', Icon: Waves },
  { value: 'temperature', label: 'Temperature', Icon: Thermometer },
  { value: 'flow', label: 'Flow', Icon: Wind },
];

export default function CalibrationPage() {
  const [activeTab, setActiveTab] = useState('ph');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Calibration
        </h1>
        <p className="text-muted-foreground">
          Calibrate sensors on the Arduino Mega wirelessly via the ESP32 bridge.
        </p>
      </div>

      {/* Info banner */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="flex items-start gap-3 p-4">
          <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>How it works:</strong> Each button queues a command to the
            backend. The ESP32 picks it up within ~3 s and forwards it to the
            Mega over UART. The Mega takes the reading, saves to EEPROM, and
            sends an ACK back. Allow 5–10 seconds total before checking results.
          </p>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        {/* Mobile: select dropdown */}
        <div className="sm:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TABS.map(({ value, label, Icon }) => (
                <SelectItem key={value} value={value}>
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: tab list */}
        <TabsList className="hidden w-full grid-cols-5 sm:grid">
          {TABS.map(({ value, label, Icon }) => (
            <TabsTrigger key={value} value={value} className="gap-2">
              <Icon className="h-4 w-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="ph">
          {' '}
          <PHTab />
        </TabsContent>
        <TabsContent value="turbidity">
          {' '}
          <TurbidityTab />
        </TabsContent>
        <TabsContent value="level">
          {' '}
          <LevelTab />
        </TabsContent>
        <TabsContent value="temperature">
          {' '}
          <TemperatureTab />
        </TabsContent>
        <TabsContent value="flow">
          {' '}
          <FlowTab />
        </TabsContent>
      </Tabs>

      <Separator />
      <CalibrationSummary />

      <Separator />
      {/* Serial Monitor — streams rainwater/logs via MQTT → SSE */}
      <SerialMonitor />
      <ResetSection />
    </div>
  );
}
