/**
 * @fileoverview Right-side vertical icon rail — template management.
 *
 * Contains template-related navigation: browse all, community,
 * my templates, create new, and import/export.
 *
 * @module components/layout/right-icon-rail
 */

import {
  LayoutTemplate,
  Globe,
  FolderOpen,
  FilePlus2,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const handleFilter = (filter: TemplateFilter) => {
    if (templatesOpen && activeFilter === filter) {
      onToggleTemplates();
    } else {
      onOpenFilter(filter);
    }
  };

  return (
    <aside className="w-14 flex flex-col items-center py-5 gap-1.5 shrink-0 bg-[#0A0A0B]">
      {/* Top icon */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2 bg-primary/10">
        <LayoutTemplate className="w-4 h-4 text-primary" />
      </div>

      {/* All Templates */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={() => handleFilter("all")}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-xl transition-all",
              templatesOpen && activeFilter === "all"
                ? "bg-white/10 text-white"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            )}
          >
            <LayoutTemplate className="w-[18px] h-[18px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={10}>All Templates</TooltipContent>
      </Tooltip>

      {/* Community */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={() => handleFilter("community")}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-xl transition-all",
              templatesOpen && activeFilter === "community"
                ? "bg-white/10 text-white"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            )}
          >
            <Globe className="w-[18px] h-[18px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={10}>Community</TooltipContent>
      </Tooltip>

      {/* My Templates */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={() => handleFilter("local")}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-xl transition-all",
              templatesOpen && activeFilter === "local"
                ? "bg-white/10 text-white"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            )}
          >
            <FolderOpen className="w-[18px] h-[18px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={10}>My Templates</TooltipContent>
      </Tooltip>

      {/* Create New */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={onCreateTemplate}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <FilePlus2 className="w-[18px] h-[18px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={10}>New Template</TooltipContent>
      </Tooltip>

      <div className="flex-1" />

      {/* Import */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all">
            <Download className="w-[18px] h-[18px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={10}>Import Templates</TooltipContent>
      </Tooltip>
    </aside>
  );
}
