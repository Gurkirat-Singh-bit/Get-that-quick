/**
 * @fileoverview Vertical icon rail — fixed at the left edge of the dashboard.
 *
 * Contains logo, new-chat shortcut, sidebar toggles, and the settings button.
 * Uses modern Lucide icons for a polished look.
 *
 * @module components/layout/icon-rail
 * @license CC BY-NC 4.0 — {@link https://creativecommons.org/licenses/by-nc/4.0/}
 * @author Gurkirat Singh
 * @created 2026-02-25
 * @updated 2026-03-03
 */

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GtqIcon } from "@/components/brand/gtq-icon";
import { LineIcon } from "@/components/icons/line-icon";

/** Props accepted by {@link IconRail}. */
interface IconRailProps {
  /** Whether the chats panel is open and active. */
  chatsOpen: boolean;
  /** Whether the projects panel is open and active. */
  projectsOpen: boolean;
  /** Toggle the chats panel/mode. */
  onToggleChats: () => void;
  /** Toggle the projects panel/mode. */
  onToggleProjects: () => void;
  /** Open the settings overlay. */
  onSettingsClick: () => void;
  /** Whether the config panel is open. */
  configOpen?: boolean;
  /** Toggle config panel visibility. */
  onToggleConfig?: () => void;
}

/**
 * Slim icon sidebar rendered at the very left of the app shell.
 *
 * @param props - {@link IconRailProps}
 */
export function IconRail({ chatsOpen, projectsOpen, onToggleChats, onToggleProjects, onSettingsClick, configOpen, onToggleConfig }: IconRailProps) {
  const itemClass = (active?: boolean) => cn(
    "w-9 h-9 flex items-center justify-center rounded-xl transition-colors border",
    active
      ? "border-white/10 bg-white/8 text-zinc-100"
      : "border-transparent text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
  );

  return (
    <aside className="w-14 flex flex-col items-center py-5 gap-1.5 shrink-0 bg-[#07080B] border-r border-white/[0.06]">
      {/* Logo */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div className="w-9 h-9 flex items-center justify-center mb-2 cursor-default">
            <GtqIcon size={30} variant="light" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          GetThatQuick
        </TooltipContent>
      </Tooltip>

      {/* Chats / Sessions */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={onToggleChats}
            className={itemClass(chatsOpen)}
          >
            <LineIcon name="chat" className="w-5 h-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          Chats
        </TooltipContent>
      </Tooltip>

      {/* Projects */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={onToggleProjects}
            className={itemClass(projectsOpen)}
          >
            <LineIcon name="projects" className="w-5 h-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          Projects
        </TooltipContent>
      </Tooltip>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Generation Config */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={onToggleConfig}
            className={itemClass(configOpen)}
          >
            <LineIcon name="config" className="w-5 h-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          Generation Config
        </TooltipContent>
      </Tooltip>

      {/* Settings */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={onSettingsClick}
            className={itemClass(false)}
          >
            <LineIcon name="settings" className="w-5 h-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          Settings
        </TooltipContent>
      </Tooltip>

    </aside>
  );
}
