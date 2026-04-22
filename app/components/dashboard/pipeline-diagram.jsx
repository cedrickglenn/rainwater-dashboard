/**
 * PipelineDiagram — mode-aware C2 → [C5] → C6 flow.
 *
 * filterMode values from the Mega:
 *   0 = Off            — all three containers dimmed
 *   1 = Charcoal only  — C2 → C6 active, C5 dimmed + "Bypassed" label
 *   2 = Charcoal + RO  — C2 → C5 → C6 all active
 *
 * C6 is the output node and carries the overall potability status, so the
 * standalone WaterQualityStatus card is no longer needed.
 */

import { cn } from '~/lib/utils';
import { calculateWaterQuality, STATUS_CONFIG, WATER_STATUS } from '~/lib/water-quality';
import { ArrowRight, ArrowDown } from 'lucide-react';

const CONTAINER_META = {
  C2: { name: 'Raw Collection',  role: 'Inlet' },
  C5: { name: 'Filter Buffer',   role: 'Carbon + RO' },
  C6: { name: 'Clean Storage',   role: 'Output' },
};

const OUTPUT_LABEL = {
  [WATER_STATUS.SAFE]:    'Potable',
  [WATER_STATUS.WARNING]: 'Caution',
  [WATER_STATUS.UNSAFE]:  'Unsafe',
  [WATER_STATUS.UNKNOWN]: 'No Data',
};

function LevelBar({ pct, active }) {
  const safePct = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500',
          active ? 'bg-primary' : 'bg-muted-foreground/30'
        )}
        style={{ width: `${safePct}%` }}
      />
    </div>
  );
}

function ContainerNode({ id, data, active, isOutput }) {
  const quality = calculateWaterQuality({
    ph:          data.ph,
    turbidity:   data.turbidity,
    temperature: data.temperature,
  });
  const status = quality.overall;
  const cfg = STATUS_CONFIG[status];
  const meta = CONTAINER_META[id];

  const borderClass = isOutput && active
    ? cfg.borderColor
    : active
      ? 'border-border'
      : 'border-dashed border-border';

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border-2 bg-card p-4 transition-all',
        borderClass,
        !active && 'opacity-60 grayscale',
        isOutput && active && 'shadow-sm'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {id}
          </p>
          <p className="text-sm font-semibold">{meta.name}</p>
        </div>
        {!active ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Bypassed
          </span>
        ) : isOutput ? (
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
              cfg.bgColor,
              cfg.color
            )}
          >
            {OUTPUT_LABEL[status]}
          </span>
        ) : (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              cfg.bgColor,
              cfg.color
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dotColor)} />
            {cfg.label}
          </span>
        )}
      </div>

      {/* Role */}
      <p className="text-xs text-muted-foreground">{meta.role}</p>

      {/* Level */}
      <div className="space-y-1">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">Level</span>
          <span className="font-mono text-sm font-semibold tabular-nums">
            {data.levelPct != null ? `${Math.round(data.levelPct)}%` : '—'}
          </span>
        </div>
        <LevelBar pct={data.levelPct} active={active} />
      </div>
    </div>
  );
}

function HorizontalConnector({ active }) {
  return (
    <div className="hidden items-center justify-center lg:flex">
      <div
        className={cn(
          'h-px w-8 flex-shrink-0',
          active ? 'bg-primary' : 'bg-muted-foreground/30'
        )}
        style={active ? {} : { backgroundImage: 'linear-gradient(to right, currentColor 50%, transparent 50%)', backgroundSize: '6px 1px', backgroundRepeat: 'repeat-x' }}
      />
      <ArrowRight
        className={cn(
          '-ml-1 h-4 w-4 flex-shrink-0',
          active ? 'text-primary' : 'text-muted-foreground/40'
        )}
      />
    </div>
  );
}

function VerticalConnector({ active }) {
  return (
    <div className="flex items-center justify-center py-1 lg:hidden">
      <ArrowDown
        className={cn(
          'h-5 w-5',
          active ? 'text-primary' : 'text-muted-foreground/40'
        )}
      />
    </div>
  );
}

export function PipelineDiagram({ containers, filterMode }) {
  // filterMode: 0 = Off, 1 = Charcoal only, 2 = Charcoal + RO
  const modeOn = filterMode !== 0;
  const c5Active = modeOn && filterMode === 2;
  const c2Active = modeOn;
  const c6Active = modeOn;

  // Active connector: C2 → C5 only when mode 2; C5 → C6 only when mode 2;
  // C2 → C6 direct is active whenever charcoal-only is selected.
  const c2ToC5Active = filterMode === 2;
  const c5ToC6Active = filterMode === 2;
  const c2ToC6Direct = filterMode === 1;

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Filtration Pipeline
      </h2>

      {/* Desktop: horizontal row */}
      <div className="hidden grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-0 lg:grid">
        <ContainerNode id="C2" data={containers.C2} active={c2Active} />
        <HorizontalConnector active={c2ToC5Active || c2ToC6Direct} />
        <ContainerNode id="C5" data={containers.C5} active={c5Active} />
        <HorizontalConnector active={c5ToC6Active || c2ToC6Direct} />
        <ContainerNode id="C6" data={containers.C6} active={c6Active} isOutput />
      </div>

      {/* Mobile: vertical stack */}
      <div className="grid gap-0 lg:hidden">
        <ContainerNode id="C2" data={containers.C2} active={c2Active} />
        <VerticalConnector active={c2ToC5Active || c2ToC6Direct} />
        <ContainerNode id="C5" data={containers.C5} active={c5Active} />
        <VerticalConnector active={c5ToC6Active || c2ToC6Direct} />
        <ContainerNode id="C6" data={containers.C6} active={c6Active} isOutput />
      </div>
    </section>
  );
}
