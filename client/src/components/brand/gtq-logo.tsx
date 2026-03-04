/**
 * @fileoverview Full GTQ brand logo — icon + "Getthatquick" wordmark.
 *
 * Collapsible: when `collapsed` is true, only the icon is shown.
 * When expanded, the full wordmark animates in.
 *
 * @module components/brand/gtq-logo
 * @license CC BY-NC 4.0
 * @author Gurkirat Singh
 * @created 2026-03-04
 */

import { cn } from "@/lib/utils";
import { GtqIcon } from "./gtq-icon";

interface GtqLogoProps {
  /** Show only the icon (collapsed mode). */
  collapsed?: boolean;
  /** Icon size in pixels. Defaults to 32. */
  iconSize?: number;
  /** Extra CSS classes on the wrapper. */
  className?: string;
}

/**
 * Full brand logo — GTQ icon + "Getthatquick" wordmark.
 * The wordmark slides in/out depending on the `collapsed` prop.
 */
export function GtqLogo({
  collapsed = false,
  iconSize = 32,
  className,
}: GtqLogoProps) {
  return (
    <div className={cn("flex items-center gap-2 overflow-hidden", className)}>
      <GtqIcon size={iconSize} variant="light" />
      <span
        className={cn(
          "font-bold text-white whitespace-nowrap transition-all duration-300 ease-in-out select-none",
          collapsed
            ? "w-0 opacity-0 -translate-x-2"
            : "w-auto opacity-100 translate-x-0",
        )}
        style={{
          fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
          fontSize: iconSize * 0.48,
          letterSpacing: "-0.02em",
        }}
      >
        Getthatquick
      </span>
    </div>
  );
}
