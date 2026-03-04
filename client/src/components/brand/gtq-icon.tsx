/**
 * @fileoverview GTQ brand icon — uses the actual extracted logo icon.
 *
 * Renders the real GetThatQuick icon PNG.
 * Use `variant="light"` on dark backgrounds (white icon),
 * `variant="dark"` on light backgrounds (original dark icon).
 *
 * @module components/brand/gtq-icon
 * @license CC BY-NC 4.0
 * @author Gurkirat Singh
 * @created 2026-03-04
 */

import { cn } from "@/lib/utils";

interface GtqIconProps {
  /** Size in pixels (used for width & height). Defaults to 32. */
  size?: number;
  /** Extra CSS classes on the wrapper. */
  className?: string;
  /**
   * `"light"` — white icon (for dark backgrounds).
   * `"dark"`  — original dark icon (for light backgrounds).
   * Defaults to `"light"`.
   */
  variant?: "light" | "dark";
}

/**
 * The GetThatQuick brand icon — uses the actual extracted logo PNGs.
 */
export function GtqIcon({
  size = 32,
  className,
  variant = "light",
}: GtqIconProps) {
  const src = variant === "light" ? "/icon-white.png" : "/icon.png";

  return (
    <img
      src={src}
      alt="GetThatQuick"
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      draggable={false}
    />
  );
}
