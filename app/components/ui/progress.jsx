/**
 * Progress Bar Component
 * Visual progress indicator
 */

import * as React from 'react';

import { cn } from '~/lib/utils';

/**
 * Progress Component
 * @param {Object} props - Component props
 * @param {number} props.value - Progress value (0-100)
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.indicatorClassName - CSS classes for the indicator
 */
const Progress = React.forwardRef(
  ({ className, value = 0, indicatorClassName, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative h-4 w-full overflow-hidden rounded-full bg-secondary',
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'h-full w-full flex-1 bg-primary transition-all',
          indicatorClassName
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </div>
  )
);

Progress.displayName = 'Progress';

export { Progress };
