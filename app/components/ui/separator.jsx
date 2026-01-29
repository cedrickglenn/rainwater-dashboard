/**
 * Separator Component
 * A visual divider between content sections
 * Based on Radix UI Separator primitive
 */

import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';

import { cn } from '~/lib/utils';

/**
 * Separator Component
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.orientation - 'horizontal' or 'vertical'
 * @param {boolean} props.decorative - Whether it's decorative only
 */
const Separator = React.forwardRef(
  (
    { className, orientation = 'horizontal', decorative = true, ...props },
    ref
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
        className
      )}
      {...props}
    />
  )
);

Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
