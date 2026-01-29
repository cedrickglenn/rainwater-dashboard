/**
 * WaterQualityStatus Component
 * Displays overall water potability status
 * Large visual indicator for the dashboard
 */

import { cn } from '~/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { ShieldCheck, ShieldAlert, ShieldX, Droplets } from 'lucide-react';
import { WATER_STATUS, STATUS_CONFIG } from '~/lib/water-quality';

/**
 * Status icons mapping
 */
const STATUS_ICONS = {
  [WATER_STATUS.SAFE]: ShieldCheck,
  [WATER_STATUS.WARNING]: ShieldAlert,
  [WATER_STATUS.UNSAFE]: ShieldX,
};

/**
 * Status background colors for the main indicator
 */
const STATUS_BG = {
  [WATER_STATUS.SAFE]:
    'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
  [WATER_STATUS.WARNING]:
    'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
  [WATER_STATUS.UNSAFE]:
    'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
};

/**
 * Icon colors
 */
const ICON_COLORS = {
  [WATER_STATUS.SAFE]: 'text-green-600 dark:text-green-400',
  [WATER_STATUS.WARNING]: 'text-amber-600 dark:text-amber-400',
  [WATER_STATUS.UNSAFE]: 'text-red-600 dark:text-red-400',
};

/**
 * WaterQualityStatus Component
 * @param {Object} props - Component props
 * @param {string} props.status - Water quality status ('safe', 'warning', 'unsafe')
 * @param {number} props.score - Potability score (0-100)
 * @param {string} props.lastChecked - Last check timestamp
 * @param {string} props.className - Additional CSS classes
 */
export function WaterQualityStatus({
  status = WATER_STATUS.SAFE,
  score = 100,
  lastChecked,
  className,
}) {
  const StatusIcon = STATUS_ICONS[status];
  const statusConfig = STATUS_CONFIG[status];

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Droplets className="h-5 w-5 text-primary" />
          Water Quality Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Main status indicator */}
        <div
          className={cn(
            'flex flex-col items-center justify-center rounded-lg border-2 p-6 transition-all',
            STATUS_BG[status]
          )}
        >
          {/* Animated status icon */}
          <div className="relative">
            <StatusIcon
              className={cn('h-16 w-16 sm:h-20 sm:w-20', ICON_COLORS[status])}
            />
            {/* Pulse animation for status */}
            {status === WATER_STATUS.SAFE && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-4 w-4 rounded-full bg-green-500"></span>
              </span>
            )}
          </div>

          {/* Status text */}
          <div className="mt-4 text-center">
            <h3
              className={cn(
                'text-2xl sm:text-3xl font-bold',
                ICON_COLORS[status]
              )}
            >
              {status === WATER_STATUS.SAFE
                ? 'Water is Potable'
                : status === WATER_STATUS.WARNING
                  ? 'Caution Advised'
                  : 'Not Safe to Drink'}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {status === WATER_STATUS.SAFE
                ? 'All parameters within safe limits'
                : status === WATER_STATUS.WARNING
                  ? 'Some parameters need attention'
                  : 'One or more parameters exceed safe limits'}
            </p>
          </div>

          {/* Potability score */}
          <div className="mt-4 flex items-center gap-4">
            <Badge variant={status} className="px-3 py-1 text-sm">
              {statusConfig.label}
            </Badge>
            <div className="text-center">
              <span className="text-2xl font-bold">{score}%</span>
              <p className="text-xs text-muted-foreground">
                Potability Score
              </p>
            </div>
          </div>
        </div>

        {/* Last checked timestamp */}
        {lastChecked && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Last updated: {lastChecked}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
