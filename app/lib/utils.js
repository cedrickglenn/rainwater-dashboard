/**
 * Utility function for merging Tailwind CSS classes
 * Combines clsx for conditional classes with tailwind-merge for deduplication
 */

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper conflict resolution
 * @param  {...any} inputs - Class names, conditionals, or arrays of classes
 * @returns {string} - Merged class string
 *
 * @example
 * cn('px-2 py-1', 'px-4') // => 'py-1 px-4'
 * cn('text-red-500', condition && 'text-blue-500')
 * cn(['class1', 'class2'], { 'class3': true })
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
