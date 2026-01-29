/**
 * TankLevel Component
 * Visual water tank level indicator
 * 
 * Mobile-first design:
 * - Larger tank visualization for visibility
 * - Bigger text for easy reading
 * - Touch-friendly layout
 */

import { cn } from '~/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Droplets, TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Get level status based on percentage
 * @param {number} level - Tank level percentage
 * @returns {Object} - Status config
 */
function getLevelStatus(level) {
  if (level >= 75) {
    return {
      label: 'Full',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-500',
      fillColor: 'from-green-400 to-green-600',
    };
  }
  if (level >= 50) {
    return {
      label: 'Good',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500',
      fillColor: 'from-blue-400 to-blue-600',
    };
  }
  if (level >= 25) {
    return {
      label: 'Low',
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500',
      fillColor: 'from-amber-400 to-amber-600',
    };
  }
  return {
    label: 'Critical',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-500',
    fillColor: 'from-red-400 to-red-600',
  };
}

/**
 * TankLevel Component
 * @param {Object} props - Component props
 * @param {number} props.level - Current tank level (0-100)
 * @param {number} props.capacity - Tank capacity in liters
 * @param {number} props.trend - Trend indicator
 * @param {string} props.className - Additional CSS classes
 */
export function TankLevel({
  level = 75,
  capacity = 1000,
  trend = 0,
  className,
}) {
  const status = getLevelStatus(level);
  const currentVolume = Math.round((level / 100) * capacity);
  const TrendIcon = trend >= 0 ? TrendingUp : TrendingDown;

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
        <CardTitle className="flex items-center justify-between text-base sm:text-lg">
          <span className="flex items-center gap-2">
            <Droplets className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Tank Level
          </span>
          <span className={cn('text-sm sm:text-base font-medium', status.color)}>
            {status.label}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="flex gap-4 sm:gap-6">
          {/* Tank visualization - larger on mobile for visibility */}
          <div className="relative flex h-36 w-24 sm:h-44 sm:w-28 flex-shrink-0 items-end justify-center rounded-b-2xl rounded-t-lg border-2 border-border bg-muted/30 overflow-hidden">
            {/* Water fill with animation */}
            <div
              className={cn(
                'absolute bottom-0 left-0 right-0 bg-gradient-to-t transition-all duration-1000 ease-out rounded-b-xl',
                status.fillColor
              )}
              style={{ height: `${level}%` }}
            >
              {/* Wave animation effect */}
              <div className="absolute inset-0 opacity-30">
                <svg
                  className="h-4 w-full absolute -top-2"
                  viewBox="0 0 100 10"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 5 Q 12.5 0, 25 5 T 50 5 T 75 5 T 100 5 V 10 H 0 Z"
                    fill="currentColor"
                    className="text-white animate-pulse"
                  />
                </svg>
              </div>
            </div>

            {/* Level markers - larger text */}
            <div className="absolute inset-y-3 right-1.5 flex flex-col justify-between">
              <span className="text-[10px] sm:text-xs text-muted-foreground">100%</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground">50%</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground">0%</span>
            </div>

            {/* Current level indicator */}
            <div
              className="absolute left-0 right-0 h-0.5 bg-foreground/50"
              style={{ bottom: `${level}%` }}
            />
          </div>

          {/* Stats - larger text for mobile readability */}
          <div className="flex flex-col justify-center space-y-4">
            {/* Percentage - prominent display */}
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl sm:text-5xl font-bold">{level}</span>
                <span className="text-xl text-muted-foreground">%</span>
              </div>
              <p className="text-sm text-muted-foreground">Current Level</p>
            </div>

            {/* Volume */}
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-semibold">
                  {currentVolume}
                </span>
                <span className="text-sm sm:text-base text-muted-foreground">
                  / {capacity} L
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Water Volume</p>
            </div>

            {/* Trend - larger for visibility */}
            <div className="flex items-center gap-2 text-sm sm:text-base">
              <TrendIcon
                className={cn(
                  'h-5 w-5',
                  trend >= 0 ? 'text-green-500' : 'text-red-500'
                )}
              />
              <span className="text-muted-foreground">
                {trend >= 0 ? 'Collecting' : 'Depleting'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
