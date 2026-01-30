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
            // Generous padding for mobile readability
            'p-4 sm:p-6 lg:p-8',
            STATUS_BG[status]
          )}
        >
          {/* Animated status icon - larger for mobile visibility */}
          <div className="relative">
            <StatusIcon
              className={cn(
                // Large icon sizes: 72px mobile, 80px tablet, 96px desktop
                'h-[72px] w-[72px] sm:h-20 sm:w-20 lg:h-24 lg:w-24',
                ICON_COLORS[status]
              )}
            />
            {/* Pulse animation for safe status */}
            {status === WATER_STATUS.SAFE && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-5 w-5 rounded-full bg-green-500"></span>
              </span>
            )}
          </div>

          {/* Status text - clear and prominent */}
          <div className="mt-4 text-center sm:mt-5">
            <h3
              className={cn(
                // Larger text on mobile for immediate readability
                'text-xl font-bold sm:text-2xl lg:text-3xl',
                ICON_COLORS[status]
              )}
            >
              {status === WATER_STATUS.SAFE
                ? 'Water is Potable'
                : status === WATER_STATUS.WARNING
                  ? 'Caution Advised'
                  : 'Not Safe to Drink'}
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground sm:text-base">
              {status === WATER_STATUS.SAFE
                ? 'All parameters within safe limits'
                : status === WATER_STATUS.WARNING
                  ? 'Some parameters need attention'
                  : 'One or more parameters exceed safe limits'}
            </p>
          </div>

          {/* Potability score and badge - touch-friendly layout */}
          <div className="mt-5 flex flex-col items-center gap-4 sm:mt-6 sm:flex-row">
            {/* Large, tappable badge */}
            <Badge
              variant={status}
              className="px-4 py-1.5 text-sm font-medium sm:text-base"
            >
              {statusConfig.label}
            </Badge>
            {/* Score display - prominent numbers */}
            <div className="text-center">
              <span className="text-3xl font-bold sm:text-4xl">{score}%</span>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Potability Score
              </p>
            </div>
          </div>
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
