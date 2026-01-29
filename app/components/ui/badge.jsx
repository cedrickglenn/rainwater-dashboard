/**
 * Badge Component
 * A small status indicator or label component
 * Based on shadcn/ui badge pattern
 */

import * as React from 'react';
import { cva } from 'class-variance-authority';

import { cn } from '~/lib/utils';

/**
 * Badge variants using class-variance-authority
 */
const badgeVariants = cva(
  // Base styles
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        // Custom variants for water quality status
        safe: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        warning:
          'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
        unsafe:
          'border-transparent bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        // Log type badges
        info: 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        success:
          'border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        error:
          'border-transparent bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

/**
 * Badge Component
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.variant - Badge variant
 * @param {React.ReactNode} props.children - Badge content
 */
function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
