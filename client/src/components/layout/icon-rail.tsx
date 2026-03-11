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

import {
  MessagesSquare,
  FolderKanban,
  Cog,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GtqIcon } from "@/components/brand/gtq-icon";

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
  return (
    <aside className="w-14 flex flex-col items-center py-5 gap-1.5 shrink-0 bg-background-dark">
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
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-xl transition-all",
              chatsOpen
                ? "bg-white/10 text-white"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            )}
          >
            <MessagesSquare className="w-4.5 h-4.5" />
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
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-xl transition-all",
              projectsOpen
                ? "bg-white/10 text-white"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            )}
          >
            <FolderKanban className="w-4.5 h-4.5" />
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
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-xl transition-all",
              configOpen
                ? "bg-white/10 text-white"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            )}
          >
            <Settings2 className="w-4.5 h-4.5" />
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
            className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
          >
            <Cog className="w-4.5 h-4.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          Settings
        </TooltipContent>
      </Tooltip>
    </aside>
  );
}
