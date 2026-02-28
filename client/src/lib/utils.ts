/**
 * @fileoverview Utility helpers shared across the client.
 *
 * @module lib/utils
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge Tailwind CSS class names with conflict resolution.
 *
 * @param inputs - Class values (strings, arrays, conditionals).
 * @returns Merged class string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
