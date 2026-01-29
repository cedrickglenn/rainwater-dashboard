/**
 * ScrollArea Component
 * Custom scrollable area with styled scrollbar
 */

import * as React from 'react';

import { cn } from '~/lib/utils';

/**
 * ScrollArea Component
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Content to scroll
 */
const ScrollArea = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('relative overflow-auto', className)}
      {...props}
    >
      {children}
    </div>
  )
);

ScrollArea.displayName = 'ScrollArea';

export { ScrollArea };
