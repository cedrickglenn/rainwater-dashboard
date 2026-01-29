/**
 * Label Component
 * Accessible label for form controls
 * Based on Radix UI Label primitive
 */

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cva } from 'class-variance-authority';

import { cn } from '~/lib/utils';

/**
 * Label variants
 */
const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
);

/**
 * Label Component
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.htmlFor - ID of the associated form element
 */
const Label = React.forwardRef(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
));

Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
