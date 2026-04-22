/**
 * @fileoverview Right-side vertical icon rail — template management.
 *
 * Contains template-related navigation: browse all, community,
 * my templates, create new, and import/export.
 *
 * @module components/layout/right-icon-rail
 * @license CC BY-NC 4.0 — {@link https://creativecommons.org/licenses/by-nc/4.0/}
 * @author Gurkirat Singh
 * @created 2026-02-25
 * @updated 2026-03-03
 */

import { cn } from "@/lib/utils";
import { Github } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LineIcon } from "@/components/icons/line-icon";
import { PROJECT_DOCS_URL, PROJECT_GITHUB_URL } from "@/lib/project-meta";

/** Which filter view is active in the templates sidebar. */
export type TemplateFilter = "all" | "community" | "local";

/** Props accepted by {@link RightIconRail}. */
interface RightIconRailProps {
  /** Whether the templates panel is open. */
  templatesOpen: boolean;
  /** Current active template filter. */
  activeFilter: TemplateFilter;
  /** Open the templates sidebar with a specific filter. */
  onOpenFilter: (filter: TemplateFilter) => void;
  /** Toggle the templates sidebar. */
  onToggleTemplates: () => void;
  /** Directly trigger template creation. */
  onCreateTemplate: () => void;
}

/**
 * Slim icon sidebar rendered at the very right of the app shell.
 * Provides quick access to template browsing, filtering, and creation.
 */
export function RightIconRail({
  templatesOpen,
  activeFilter,
  onOpenFilter,
  onToggleTemplates,
  onCreateTemplate,
}: RightIconRailProps) {
  const itemClass = (active?: boolean) => cn(
    "w-9 h-9 flex items-center justify-center rounded-xl transition-colors border",
    active
      ? "border-white/10 bg-white/8 text-zinc-100"
      : "border-transparent text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
  );

  const handleFilter = (filter: TemplateFilter) => {
    if (templatesOpen && activeFilter === filter) {
      onToggleTemplates();
    } else {
      onOpenFilter(filter);
    }
  };

  return (
    <aside className="w-14 flex flex-col items-center py-5 gap-1.5 shrink-0 bg-[#07080B] border-l border-white/[0.06]">
      {/* All Templates */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={() => handleFilter("all")}
            className={itemClass(templatesOpen && activeFilter === "all")}
          >
            <LineIcon name="templates" className="w-5 h-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={10}>All Templates</TooltipContent>
      </Tooltip>

      {/* Community */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={() => handleFilter("community")}
            className={itemClass(templatesOpen && activeFilter === "community")}
          >
            <LineIcon name="community" className="w-5 h-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={10}>Community</TooltipContent>
      </Tooltip>

      {/* My Templates */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={() => handleFilter("local")}
            className={itemClass(templatesOpen && activeFilter === "local")}
          >
            <LineIcon name="local" className="w-5 h-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={10}>My Templates</TooltipContent>
      </Tooltip>

      {/* Create New */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={onCreateTemplate}
            className={itemClass(false)}
          >
            <LineIcon name="new-template" className="w-5 h-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={10}>New Template</TooltipContent>
      </Tooltip>

      <div className="flex-1" />

      {/* GitHub */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <a
            href={PROJECT_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={itemClass(false)}
          >
            <Github className="w-4.5 h-4.5" />
          </a>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={10}>GitHub</TooltipContent>
      </Tooltip>

      {/* Docs */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <a
            href={PROJECT_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={itemClass(false)}
          >
            <LineIcon name="docs" className="w-5 h-5" />
          </a>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={10}>Documentation</TooltipContent>
      </Tooltip>
    </aside>
  );
}
