/**
 * SensorCard Component
 * Displays individual sensor readings with status indicators
 * Used on the dashboard and sensors pages
 * 
 * Mobile-first design:
 * - Touch-friendly with 44px+ tap targets
 * - Larger icons (h-6/h-7) for better visibility
 * - Generous padding for thumb navigation
 * - Clear visual hierarchy with prominent values
 */

import { cn } from '~/lib/utils';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import {
  Droplets,
  Eye,
  Beaker,
  Thermometer,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import {
  SENSOR_THRESHOLDS,
  getSensorStatus,
  STATUS_CONFIG,
} from '~/lib/water-quality';

/**
 * Icon mapping for sensor types
 */
const SENSOR_ICONS = {
  ph: Droplets,
  turbidity: Eye,
  tds: Beaker,
  temperature: Thermometer,
};

/**
 * Gradient classes for sensor cards
 */
const SENSOR_GRADIENTS = {
  ph: 'from-purple-500/10 to-purple-600/5 dark:from-purple-500/20 dark:to-purple-600/10',
  turbidity:
    'from-amber-500/10 to-amber-600/5 dark:from-amber-500/20 dark:to-amber-600/10',
  tds: 'from-sky-500/10 to-sky-600/5 dark:from-sky-500/20 dark:to-sky-600/10',
  temperature:
    'from-red-500/10 to-red-600/5 dark:from-red-500/20 dark:to-red-600/10',
};

/**
 * Icon background colors - larger container for touch targets
 */
const ICON_COLORS = {
  ph: 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400',
  turbidity:
    'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400',
  tds: 'bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400',
  temperature: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400',
};

/**
 * SensorCard Component
 * @param {Object} props - Component props
 * @param {string} props.type - Sensor type (ph, turbidity, tds, temperature)
 * @param {number} props.value - Current sensor reading
 * @param {number} props.trend - Trend indicator (-1, 0, 1)
 * @param {string} props.lastUpdated - Last update timestamp
 * @param {string} props.className - Additional CSS classes
 */
export function SensorCard({
  type,
  value,
  trend = 0,
  lastUpdated,
  className,
}) {
  const threshold = SENSOR_THRESHOLDS[type];
  const status = getSensorStatus(type, value);
  const statusConfig = STATUS_CONFIG[status];
  const Icon = SENSOR_ICONS[type];

  // Get trend icon
  const TrendIcon =
    trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor =
    trend > 0
      ? 'text-green-500'
      : trend < 0
        ? 'text-red-500'
        : 'text-muted-foreground';

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-200',
        // Touch-friendly: entire card is tappable
        'active:scale-[0.98] touch-manipulation',
        'hover:shadow-md',
        `bg-gradient-to-br ${SENSOR_GRADIENTS[type]}`,
        className
      )}
    >
      {/* Increased padding for touch: p-5 on mobile, p-6 on larger screens */}
      <CardContent className="p-5 sm:p-6">
        {/* Header with icon and status */}
        <div className="flex items-start justify-between">
          {/* Larger icon container (44px+) for better touch and visibility */}
          <div className={cn(
            'rounded-xl p-2.5 sm:p-3',
            ICON_COLORS[type]
          )}>
            <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          {/* Larger badge for readability */}
          <Badge variant={status} className="text-xs sm:text-sm px-2.5 py-1">
            {statusConfig.label}
          </Badge>
        </div>

        {/* Sensor name - larger text for readability */}
        <div className="mt-4">
          <p className="text-sm sm:text-base text-muted-foreground font-medium">
            {threshold.name}
          </p>
        </div>

        {/* Value display - prominent and easy to read */}
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-3xl sm:text-4xl font-bold tracking-tight">
            {typeof value === 'number' ? value.toFixed(1) : value}
          </span>
          <span className="text-sm sm:text-base text-muted-foreground">
            {threshold.unit}
          </span>
        </div>

        {/* Trend and safe range - larger text */}
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <TrendIcon className={cn('h-4 w-4', trendColor)} />
            <span>
              {trend > 0 ? 'Rising' : trend < 0 ? 'Falling' : 'Stable'}
            </span>
          </div>
          <span className="text-xs sm:text-sm">Safe: {threshold.safeRange}</span>
        </div>
      </CardContent>

      {/* Status indicator bar at bottom - thicker for visibility */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-1.5',
          statusConfig.dotColor
        )}
      />
    </Card>
  );
}
