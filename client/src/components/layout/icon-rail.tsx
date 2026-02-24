import {
  Zap,
  MessageSquare,
  BookTemplate,
  SquarePen,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PanelState } from "@/pages/dashboard";

interface IconRailProps {
  panels: PanelState;
  onTogglePanel: (side: "left" | "right") => void;
  onSettingsClick: () => void;
}

export function IconRail({ panels, onTogglePanel, onSettingsClick }: IconRailProps) {
  return (
    <aside className="w-14 flex flex-col items-center py-5 gap-6 shrink-0 bg-[#1E1E1E]">
      {/* Logo */}
      <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
        <Zap className="w-4 h-4 text-primary" />
      </div>

      {/* New Chat */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all">
            <SquarePen className="w-[18px] h-[18px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          New Chat
        </TooltipContent>
      </Tooltip>

      {/* Chats / Sessions (left sidebar) */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={() => onTogglePanel("left")}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-xl transition-all",
              panels.left
                ? "bg-white/10 text-white"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
            )}
          >
            <MessageSquare className="w-[18px] h-[18px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          Sessions
        </TooltipContent>
      </Tooltip>

      {/* Templates (right sidebar) */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={() => onTogglePanel("right")}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-xl transition-all",
              panels.right
                ? "bg-white/10 text-white"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
            )}
          >
            <BookTemplate className="w-[18px] h-[18px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          Templates
        </TooltipContent>
      </Tooltip>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings */}
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={onSettingsClick}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
          >
            <Settings className="w-[18px] h-[18px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          Settings
        </TooltipContent>
      </Tooltip>
    </aside>
  );
}
