/**
 * StatCard Component
 * Simple statistics display card
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
    <Card className={cn('', className)}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          {Icon && (
            <div className={cn('rounded-lg p-2', iconColor)}>
              <Icon className="h-5 w-5" />
            </div>
          )}
          {change !== undefined && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs font-medium',
                isPositive && 'text-green-600 dark:text-green-400',
                isNegative && 'text-red-600 dark:text-red-400',
                !isPositive && !isNegative && 'text-muted-foreground'
              )}
            >
              <TrendIcon className="h-3 w-3" />
              <span>{Math.abs(change)}%</span>
            </div>
          )}
        </div>

        <div className="mt-3">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold">{value}</span>
            {unit && (
              <span className="text-sm text-muted-foreground">{unit}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
