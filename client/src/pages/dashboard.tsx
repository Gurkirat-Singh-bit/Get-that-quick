import { useState, useCallback } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { IconRail } from "@/components/layout/icon-rail";
import { LeftSidebar } from "@/components/sidebar/left-sidebar";
import { ChatArea } from "@/components/chat/chat-area";
import { RightSidebar } from "@/components/sidebar/right-sidebar";
import { SettingsOverlay } from "@/components/settings/settings-overlay";

export interface PanelState {
  left: boolean;
  right: boolean;
}

export function Dashboard() {
  const [panels, setPanels] = useState<PanelState>({ left: false, right: false });
  const [settingsOpen, setSettingsOpen] = useState(false);

  const togglePanel = useCallback((side: "left" | "right") => {
    setPanels((prev) => ({ ...prev, [side]: !prev[side] }));
  }, []);

  return (
    <TooltipProvider>
      <div className="h-screen w-screen bg-[#1E1E1E] flex overflow-hidden">
        {/* Icon rail */}
        <IconRail
          panels={panels}
          onTogglePanel={togglePanel}
          onSettingsClick={() => setSettingsOpen(true)}
        />

        {/* Left sidebar — sessions / recent chats */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            panels.left ? "w-72" : "w-0"
          }`}
        >
          <div className="w-72 h-full">
            <LeftSidebar />
          </div>
        </div>

        {/* Main chat area */}
        <main className="flex-1 bg-white m-2 rounded-2xl flex overflow-hidden min-w-0">
          <ChatArea
            templatesOpen={panels.right}
            onToggleTemplates={() => togglePanel("right")}
          />
        </main>

        {/* Right sidebar — templates */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            panels.right ? "w-72" : "w-0"
          }`}
        >
          <div className="w-72 h-full">
            <RightSidebar />
          </div>
        </div>
      </div>

      {/* Settings overlay */}
      {settingsOpen && <SettingsOverlay onClose={() => setSettingsOpen(false)} />}
    </TooltipProvider>
  );
}

