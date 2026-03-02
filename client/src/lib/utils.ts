/**
 * @fileoverview Utility helpers shared across the client.
 *
 * @module lib/utils
 * @license CC BY-NC 4.0 — {@link https://creativecommons.org/licenses/by-nc/4.0/}
 * @author Gurkirat Singh
 * @created 2026-02-25
 * @updated 2026-03-03
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
