/**
 * PipelineStatus Component
 * Shows the current state of the three main state machines from the Mega:
 *   - First Flush (ff_state: 0=IDLE, 1=FLUSHING, 2=DIVERTING)
 *   - Filter Mode (filter_mode: 0=CHARCOAL_ONLY, 1=CHARCOAL_AND_RO)
 *   - Backwash    (backwash_state: 0=IDLE, 1=RUNNING)
 *
 * Also shows hardware online/offline status derived from the last heartbeat timestamp.
 */

import { cn } from '~/lib/utils';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import {
  Wifi,
  WifiOff,
  Filter,
  RotateCcw,
  CloudRain,
} from 'lucide-react';

// ── First Flush state labels ──────────────────────────────────────────────
const FF_STATES = [
  { label: 'Idle',      variant: 'secondary' },
  { label: 'Flushing',  variant: 'warning'   },
  { label: 'Diverting', variant: 'safe'      },
];

// ── Filter mode labels ────────────────────────────────────────────────────
const FILTER_MODES = [
  { label: 'Charcoal',       variant: 'safe'      },
  { label: 'Charcoal + RO',  variant: 'safe'      },
];

// ── Backwash state labels ─────────────────────────────────────────────────
const BACKWASH_STATES = [
  { label: 'Idle',    variant: 'secondary' },
  { label: 'Running', variant: 'warning'   },
];

// Staleness threshold: if last heartbeat is older than this, show offline.
const OFFLINE_THRESHOLD_MS = 90_000; // 90 s (heartbeat fires every ~30 s)

function PillItem({ icon: Icon, label, children, iconClass, className }) {
  return (
    <div className={cn('flex items-center gap-2 min-w-0', className)}>
      <div className={cn('flex-shrink-0 rounded-lg p-1.5', iconClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground leading-none">
          {label}
        </span>
        {children}
      </div>
    </div>
  );
}

export function PipelineStatus({
  ffState       = 0,
  filterMode    = 0,
  backwashState = 0,
  lastHeartbeat = null, // ISO string or null
  className,
}) {
  const ff       = FF_STATES[ffState]       ?? FF_STATES[0];
  const filter   = FILTER_MODES[filterMode] ?? FILTER_MODES[0];
  const backwash = BACKWASH_STATES[backwashState] ?? BACKWASH_STATES[0];

  const isOnline = lastHeartbeat != null
    && (Date.now() - new Date(lastHeartbeat).getTime()) < OFFLINE_THRESHOLD_MS;

  return (
    <Card className={cn('', className)}>
      <CardContent className="px-4 py-3 sm:px-5 sm:py-4">
        {/* 2-col on mobile, 4-col on sm+ — every item gets equal space */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-border">

          {/* Hardware online status */}
          <PillItem
            icon={isOnline ? Wifi : WifiOff}
            label="Hardware"
            iconClass={
              isOnline
                ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400'
                : 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'
            }
          >
            <Badge variant={isOnline ? 'safe' : 'unsafe'} className="text-xs w-fit">
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </PillItem>

          {/* First Flush */}
          <PillItem
            icon={CloudRain}
            label="First Flush"
            iconClass="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
            className="sm:px-4"
          >
            <Badge variant={ff.variant} className="text-xs w-fit">
              {ff.label}
            </Badge>
          </PillItem>

          {/* Filter Mode */}
          <PillItem
            icon={Filter}
            label="Filter Mode"
            iconClass="bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400"
            className="sm:px-4"
          >
            <Badge variant={filter.variant} className="text-xs w-fit">
              {filter.label}
            </Badge>
          </PillItem>

          {/* Backwash */}
          <PillItem
            icon={RotateCcw}
            label="Backwash"
            iconClass="bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
            className="sm:px-4"
          >
            <Badge variant={backwash.variant} className="text-xs w-fit">
              {backwash.label}
            </Badge>
          </PillItem>

        </div>
      </CardContent>
    </Card>
  );
}
