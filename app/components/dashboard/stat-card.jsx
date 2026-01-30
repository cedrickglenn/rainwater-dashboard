/**
 * StatCard Component
 * Simple statistics display card
 *
 * Mobile-first design:
 * - Larger icons for touch-friendly interface
 * - Generous padding for easier interaction
 * - Prominent values that are easy to read at a glance
 */

import { cn } from '~/lib/utils';
import { Card, CardContent } from '~/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * StatCard Component
 * @param {Object} props - Component props
 * @param {string} props.title - Stat title
 * @param {string|number} props.value - Main value
 * @param {string} props.unit - Value unit
 * @param {number} props.change - Change percentage
 * @param {React.ReactNode} props.icon - Icon component
 * @param {string} props.iconColor - Icon background color class
 * @param {string} props.className - Additional CSS classes
 */
export function StatCard({
  title,
  value,
  unit,
  change,
  icon: Icon,
  iconColor = 'bg-primary/10 text-primary',
  className,
}) {
  const isPositive = change > 0;
  const isNegative = change < 0;
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <Card className={cn('touch-manipulation', className)}>
      {/* Generous padding for touch: p-5 mobile, p-6 larger screens */}
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          {/* Larger icon container (44px+) */}
          {Icon && (
            <div className={cn('rounded-xl p-2.5 sm:p-3', iconColor)}>
              <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
          )}
          {/* Larger trend indicator for readability */}
          {change !== undefined && (
            <div
              className={cn(
                'flex items-center gap-1.5 text-sm font-medium',
                isPositive && 'text-green-600 dark:text-green-400',
                isNegative && 'text-red-600 dark:text-red-400',
                !isPositive && !isNegative && 'text-muted-foreground'
              )}
            >
              <TrendIcon className="h-4 w-4" />
              <span>{Math.abs(change)}%</span>
            </div>
          )}
        </div>

        {/* Stat content with larger text */}
        <div className="mt-4">
          <p className="text-sm font-medium text-muted-foreground sm:text-base">
            {title}
          </p>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold sm:text-3xl">{value}</span>
            {unit && (
              <span className="text-sm text-muted-foreground sm:text-base">
                {unit}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
