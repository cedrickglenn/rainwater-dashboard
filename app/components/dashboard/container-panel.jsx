/**
 * ContainerPanel Component
 * Shows pH, turbidity, and temperature readings for a single container (C2, C5, or C6),
 * plus a vertical level bar derived from the calibrated level percentage.
 *
 * Three of these are placed side-by-side to show the filtration pipeline:
 *   C2 (Raw Rainwater) → C5 (After Filter) → C6 (Final Storage)
 *
 * Sensor status chips use the same getSensorStatus logic as the rest of the app
 * so colour coding is consistent (green = safe, amber = warning, red = unsafe).
 */

import { cn } from '~/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Droplets, Eye, Thermometer } from 'lucide-react';
import { getSensorStatus, STATUS_CONFIG, WATER_STATUS } from '~/lib/water-quality';

// ── Container metadata ────────────────────────────────────────────────────
const CONTAINER_META = {
  C2: {
    label:       'C2',
    title:       'Raw Rainwater',
    description: 'Incoming collected rainwater',
    accent:      'border-blue-400 dark:border-blue-600',
    headerBg:    'bg-blue-50 dark:bg-blue-950/40',
    levelColor:  'from-blue-400 to-blue-600',
    levelBg:     'bg-blue-100 dark:bg-blue-900/30',
  },
  C5: {
    label:       'C5',
    title:       'After Filter',
    description: 'Post-charcoal buffer',
    accent:      'border-amber-400 dark:border-amber-600',
    headerBg:    'bg-amber-50 dark:bg-amber-950/40',
    levelColor:  'from-amber-400 to-amber-600',
    levelBg:     'bg-amber-100 dark:bg-amber-900/30',
  },
  C6: {
    label:       'C6',
    title:       'Final Storage',
    description: 'Treated potable water',
    accent:      'border-green-400 dark:border-green-600',
    headerBg:    'bg-green-50 dark:bg-green-950/40',
    levelColor:  'from-green-400 to-green-600',
    levelBg:     'bg-green-100 dark:bg-green-900/30',
  },
};

// ── Sensor chip ───────────────────────────────────────────────────────────
function SensorChip({ icon: Icon, label, value, unit, sensorType }) {
  const status = getSensorStatus(sensorType, value);
  const cfg    = STATUS_CONFIG[status];
  const hasValue = value != null;

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b last:border-b-0 border-border/50">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={cn(
          'text-sm font-semibold tabular-nums',
          !hasValue && 'text-muted-foreground'
        )}>
          {hasValue ? value.toFixed(sensorType === 'ph' ? 2 : 1) : '—'}
        </span>
        {hasValue && (
          <span className="text-xs text-muted-foreground">{unit}</span>
        )}
        <Badge
          variant={hasValue ? status : 'secondary'}
          className="text-[10px] px-1.5 py-0.5 leading-none"
        >
          {hasValue ? cfg.label : 'No data'}
        </Badge>
      </div>
    </div>
  );
}

// ── Level bar ─────────────────────────────────────────────────────────────
function LevelBar({ pct, meta }) {
  const clamped = Math.max(0, Math.min(100, pct ?? 0));
  const hasData = pct != null;

  // Colour the bar based on level
  let barColor = meta.levelColor;
  if (hasData && clamped < 20) barColor = 'from-red-400 to-red-600';
  else if (hasData && clamped < 40) barColor = 'from-amber-400 to-amber-600';

  return (
    <div className="flex flex-col items-center gap-1 w-8 flex-shrink-0">
      {/* Track */}
      <div className={cn(
        'relative w-5 flex-1 rounded-full overflow-hidden border border-border',
        meta.levelBg
      )}>
        {/* Fill */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t transition-all duration-700',
            barColor
          )}
          style={{ height: hasData ? `${clamped}%` : '0%' }}
        />
      </div>
      {/* Percentage label */}
      <span className={cn(
        'text-[10px] font-semibold tabular-nums leading-none',
        !hasData && 'text-muted-foreground'
      )}>
        {hasData ? `${Math.round(clamped)}%` : '—'}
      </span>
    </div>
  );
}

// ── ContainerPanel ────────────────────────────────────────────────────────
/**
 * @param {Object}  props
 * @param {'C2'|'C5'|'C6'} props.container  - Which container this panel represents
 * @param {number|null} props.levelPct       - Water level 0–100 % (calibrated)
 * @param {number|null} props.ph             - pH value
 * @param {number|null} props.turbidity      - Turbidity in NTU
 * @param {number|null} props.temperature    - Temperature in °C
 * @param {string}  props.className
 */
export function ContainerPanel({
  container   = 'C6',
  levelPct    = null,
  ph          = null,
  turbidity   = null,
  temperature = null,
  className,
}) {
  const meta = CONTAINER_META[container] ?? CONTAINER_META.C6;

  // Overall quality for this container (same logic as main hero, scoped to this container)
  const statuses = [
    getSensorStatus('ph',          ph),
    getSensorStatus('turbidity',   turbidity),
    getSensorStatus('temperature', temperature),
  ].filter(s => s !== WATER_STATUS.UNKNOWN);

  let overall = WATER_STATUS.UNKNOWN;
  if (statuses.length > 0) {
    if (statuses.includes(WATER_STATUS.UNSAFE))  overall = WATER_STATUS.UNSAFE;
    else if (statuses.includes(WATER_STATUS.WARNING)) overall = WATER_STATUS.WARNING;
    else overall = WATER_STATUS.SAFE;
  }
  const overallCfg = STATUS_CONFIG[overall];

  return (
    <Card className={cn('flex flex-col overflow-hidden border-t-4', meta.accent, className)}>
      {/* Header */}
      <CardHeader className={cn('px-4 py-3 pb-2', meta.headerBg)}>
        <CardTitle className="flex items-center justify-between text-sm">
          <div>
            <span className="font-bold">{meta.label}</span>
            <span className="ml-1.5 font-normal text-muted-foreground">{meta.title}</span>
          </div>
          {overall !== WATER_STATUS.UNKNOWN && (
            <Badge variant={overall} className="text-[10px]">
              {overallCfg.label}
            </Badge>
          )}
        </CardTitle>
        <p className="text-[11px] text-muted-foreground mt-0.5">{meta.description}</p>
      </CardHeader>

      {/* Content: level bar + sensor chips */}
      <CardContent className="px-4 py-3 flex gap-3 flex-1">
        {/* Vertical level bar */}
        <LevelBar pct={levelPct} meta={meta} />

        {/* Sensor readings */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <SensorChip
            icon={Droplets}
            label="pH"
            value={ph}
            unit="pH"
            sensorType="ph"
          />
          <SensorChip
            icon={Eye}
            label="Turbidity"
            value={turbidity}
            unit="NTU"
            sensorType="turbidity"
          />
          <SensorChip
            icon={Thermometer}
            label="Temp"
            value={temperature}
            unit="°C"
            sensorType="temperature"
          />
        </div>
      </CardContent>
    </Card>
  );
}
