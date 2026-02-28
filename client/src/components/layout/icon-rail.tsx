/**
 * @fileoverview Vertical icon rail — fixed at the left edge of the dashboard.
 *
 * Contains logo, new-chat shortcut, sidebar toggles, and the settings button.
 * Uses modern Lucide icons for a polished look.
 *
 * @module components/layout/icon-rail
 */

import {
  Sparkles,
  MessagesSquare,
  PenLine,
  FolderKanban,
  Settings2,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Props accepted by {@link IconRail}. */
interface IconRailProps {
  /** Whether the chats panel is open. */
  chatsOpen: boolean;
  /** Whether the projects view is active. */
  projectsOpen: boolean;
  /** Toggle the chats panel. */
  onToggleChats: () => void;
  /** Toggle the projects view. */
  onToggleProjects: () => void;
  /** Open the settings overlay. */
  onSettingsClick: () => void;
  /** Create a new chat session. */
  onNewChat: () => void;
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
export function IconRail({ chatsOpen, projectsOpen, onToggleChats, onToggleProjects, onSettingsClick, onNewChat, configOpen, onToggleConfig }: IconRailProps) {
  return (
    <aside className="w-14 flex flex-col items-center py-5 gap-1.5 shrink-0 bg-[#0A0A0B]">
      {/* Logo */}
      <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center mb-2">
        <Sparkles className="w-4 h-4 text-primary" />
      </div>

      {/* New Chat */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={onNewChat}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <PenLine className="w-[18px] h-[18px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          New Chat
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
            <MessagesSquare className="w-[18px] h-[18px]" />
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
            <FolderKanban className="w-[18px] h-[18px]" />
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
            <SlidersHorizontal className="w-[18px] h-[18px]" />
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
            <Settings2 className="w-[18px] h-[18px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          Settings
        </TooltipContent>
      </Tooltip>
    </aside>
  );
}
