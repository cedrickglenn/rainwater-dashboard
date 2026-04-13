/**
 * WaterQualityStatus Component
 * Displays overall water potability status
 * Large visual indicator for the dashboard
 *
 * Mobile-first design:
 * - Hero component: most prominent element on dashboard
 * - Large, clear status icon visible at a glance
 * - Touch-friendly badge and score display
 * - Designed to fit well on mobile screens first
 */

import { cn } from '~/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { ShieldCheck, ShieldAlert, ShieldX, ShieldQuestion, Droplets } from 'lucide-react';
import { WATER_STATUS, STATUS_CONFIG } from '~/lib/water-quality';

/**
 * Status icons mapping
 */
const STATUS_ICONS = {
  [WATER_STATUS.SAFE]:    ShieldCheck,
  [WATER_STATUS.WARNING]: ShieldAlert,
  [WATER_STATUS.UNSAFE]:  ShieldX,
  [WATER_STATUS.UNKNOWN]: ShieldQuestion,
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
  [WATER_STATUS.UNKNOWN]:
    'bg-muted/40 border-border',
};

/**
 * Icon colors
 */
const ICON_COLORS = {
  [WATER_STATUS.SAFE]:    'text-green-600 dark:text-green-400',
  [WATER_STATUS.WARNING]: 'text-amber-600 dark:text-amber-400',
  [WATER_STATUS.UNSAFE]:  'text-red-600 dark:text-red-400',
  [WATER_STATUS.UNKNOWN]: 'text-muted-foreground',
};

/**
 * Human-readable headline per status
 */
const STATUS_HEADLINE = {
  [WATER_STATUS.SAFE]:    'Water is Potable',
  [WATER_STATUS.WARNING]: 'Caution Advised',
  [WATER_STATUS.UNSAFE]:  'Not Safe to Drink',
  [WATER_STATUS.UNKNOWN]: 'Awaiting Sensor Data',
};

/**
 * Sub-text per status
 */
const STATUS_SUBTEXT = {
  [WATER_STATUS.SAFE]:    'All parameters within safe limits',
  [WATER_STATUS.WARNING]: 'Some parameters need attention',
  [WATER_STATUS.UNSAFE]:  'One or more parameters exceed safe limits',
  [WATER_STATUS.UNKNOWN]: 'No live readings yet — connect the hardware to get a reading',
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
  status = WATER_STATUS.UNKNOWN,
  lastChecked,
  className,
}) {
  const resolvedStatus = STATUS_ICONS[status] ? status : WATER_STATUS.UNKNOWN;
  const StatusIcon  = STATUS_ICONS[resolvedStatus];
  const statusConfig = STATUS_CONFIG[resolvedStatus];
  const status_ = resolvedStatus; // alias for readability below

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Compact header on mobile */}
      <CardHeader className="px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Droplets className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          Water Quality Status
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
        {/* Main status indicator - full width hero style on mobile */}
        <div
          className={cn(
            'flex flex-col items-center justify-center rounded-xl border-2 transition-all',
            'p-4 sm:p-6 lg:p-8',
            STATUS_BG[status_]
          )}
        >
          {/* Status icon */}
          <div className="relative">
            <StatusIcon
              className={cn(
                'h-[72px] w-[72px] sm:h-20 sm:w-20 lg:h-24 lg:w-24',
                ICON_COLORS[status_]
              )}
            />
            {/* Pulse animation only when confirmed safe */}
            {status_ === WATER_STATUS.SAFE && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-5 w-5 rounded-full bg-green-500"></span>
              </span>
            )}
          </div>

          {/* Status text */}
          <div className="mt-4 text-center sm:mt-5">
            <h3
              className={cn(
                'text-xl font-bold sm:text-2xl lg:text-3xl',
                ICON_COLORS[status_]
              )}
            >
              {STATUS_HEADLINE[status_]}
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground sm:text-base">
              {STATUS_SUBTEXT[status_]}
            </p>
          </div>

          {/* Status badge — omit for unknown since "No Data" badge adds no value */}
          {status_ !== WATER_STATUS.UNKNOWN && (
            <div className="mt-5 flex flex-col items-center gap-4 sm:mt-6 sm:flex-row">
              <Badge
                variant={status_}
                className="px-4 py-1.5 text-sm font-medium sm:text-base"
              >
                {statusConfig.label}
              </Badge>
            </div>
          )}
        </div>

        {/* Last checked timestamp - adequate size for mobile */}
        {lastChecked && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Last updated: {lastChecked}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
