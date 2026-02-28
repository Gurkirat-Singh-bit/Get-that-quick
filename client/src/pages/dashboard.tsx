/**
 * @fileoverview Dashboard page — main app shell.
 *
 * Composes the icon rail, sidebars, chat area, and settings overlay.
 * Owns the top-level hooks for sessions, templates, and settings,
 * and threads data down to child components.
 *
 * @module pages/dashboard
 */

import { useState, useCallback } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { IconRail } from "@/components/layout/icon-rail";
import { RightIconRail } from "@/components/layout/right-icon-rail";
import type { TemplateFilter } from "@/components/layout/right-icon-rail";
import { LeftSidebar } from "@/components/sidebar/left-sidebar";
import { ChatArea } from "@/components/chat/chat-area";
import { RightSidebar } from "@/components/sidebar/right-sidebar";
import { TemplateEditor } from "@/components/templates/template-editor";
import { SettingsOverlay } from "@/components/settings/settings-overlay";
import { useSessions } from "@/hooks/use-sessions";
import { useTemplates } from "@/hooks/use-templates";
import { useSettings } from "@/hooks/use-settings";
import type { Project } from "@shared/types";

/** Tracks which side panels are visible. */
export interface PanelState {
  left: boolean;
  right: boolean;
}

/**
 * Root dashboard component.
 *
 * Manages panel visibility, hooks into session/template APIs,
 * and delegates rendering to specialised child components.
 */
const PROJECT_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#f97316"];

export function Dashboard() {
  const [panels, setPanels] = useState<PanelState>({ left: false, right: false });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [templateFilter, setTemplateFilter] = useState<TemplateFilter>("all");
  const [triggerCreate, setTriggerCreate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [nextColorIdx, setNextColorIdx] = useState(0);

  const sessionHook = useSessions();
  const templateHook = useTemplates();
  const settingsHook = useSettings();

  /** Toggle a side panel open/closed. */
  const togglePanel = useCallback((side: "left" | "right") => {
    setPanels((prev) => ({ ...prev, [side]: !prev[side] }));
  }, []);

  /** Open right sidebar with a specific filter. */
  const openTemplateFilter = useCallback((filter: TemplateFilter) => {
    setTemplateFilter(filter);
    setPanels((prev) => ({ ...prev, right: true }));
  }, []);

  /** Handle create template from right rail button. */
  const handleCreateFromRail = useCallback(() => {
    setTemplateFilter("local");
    setPanels((prev) => ({ ...prev, right: true }));
    setTriggerCreate(true);
  }, []);

  /** Create a new project (local state). */
  const handleCreateProject = useCallback((name: string) => {
    const project: Project = {
      id: crypto.randomUUID(),
      name,
      description: "",
      color: PROJECT_COLORS[nextColorIdx % PROJECT_COLORS.length],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProjects((prev) => [...prev, project]);
    setNextColorIdx((i) => i + 1);
  }, [nextColorIdx]);

  /** Delete a project. Chats in it become ungrouped. */
  const handleDeleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    sessionHook.sessions.forEach((s) => {
      if (s.projectId === id) sessionHook.moveSession(s.id, null);
    });
  }, [sessionHook]);

  /** Move a session into or out of a project. */
  const handleMoveSession = useCallback((sessionId: string, projectId: string | null) => {
    sessionHook.moveSession(sessionId, projectId);
  }, [sessionHook]);

  return (
    <TooltipProvider>
      <div className="h-screen w-screen bg-[#0A0A0B] flex overflow-hidden">
        {/* Left icon rail — chats, new chat, settings */}
        <IconRail
          chatsOpen={panels.left}
          projectsOpen={projectsOpen}
          onToggleChats={() => togglePanel("left")}
          onToggleProjects={() => setProjectsOpen((p) => !p)}
          onSettingsClick={() => setSettingsOpen(true)}
          onNewChat={async () => { await sessionHook.createSession(); }}
        />

        {/* Left sidebar — sessions / recent chats */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            panels.left ? "w-72" : "w-0"
          }`}
        >
          <div className="w-72 h-full">
            <LeftSidebar
              sessions={sessionHook.sessions}
              activeSessionId={sessionHook.activeSession?.id ?? null}
              onSelectSession={sessionHook.selectSession}
              onCreateSession={async (title) => { await sessionHook.createSession(title); }}
              onDeleteSession={sessionHook.deleteSession}
              onRenameSession={sessionHook.renameSession}
              loading={sessionHook.loading}
              projects={projects}
              onCreateProject={handleCreateProject}
              onDeleteProject={handleDeleteProject}
              onMoveSession={handleMoveSession}
            />
          </div>
        </div>

        {/* Main chat area — light themed center */}
        <main className="flex-1 bg-[#F8F9FB] m-2 rounded-2xl flex overflow-hidden min-w-0 border border-[#E2E4E9]">
          <ChatArea
            session={sessionHook.activeSession}
            onSend={sessionHook.sendMessage}
            generating={sessionHook.generating}
            onNewChat={async () => { await sessionHook.createSession(); }}
            settings={settingsHook.settings}
            onOpenSettings={() => setSettingsOpen(true)}
            onSaveAsTemplate={async (content) => {
              const tmpl = await templateHook.createTemplate("Untitled Template", content, "", "general");
              setEditingTemplateId(tmpl.id);
            }}
          />
        </main>

        {/* Right sidebar — templates */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            panels.right ? "w-72" : "w-0"
          }`}
        >
          <div className="w-72 h-full">
            <RightSidebar
              community={templateHook.community}
              local={templateHook.local}
              onCreateTemplate={templateHook.createTemplate}
              onDeleteTemplate={templateHook.deleteTemplate}
              onEditTemplate={(id) => setEditingTemplateId(id)}
              loading={templateHook.loading}
              filter={templateFilter}
              externalCreate={triggerCreate}
              onExternalCreateDone={() => setTriggerCreate(false)}
            />
          </div>
        </div>

        {/* Right icon rail — templates */}
        <RightIconRail
          templatesOpen={panels.right}
          activeFilter={templateFilter}
          onOpenFilter={openTemplateFilter}
          onToggleTemplates={() => togglePanel("right")}
          onCreateTemplate={handleCreateFromRail}
        />
      </div>

      {/* Settings overlay */}
      {settingsOpen && (
        <SettingsOverlay
          onClose={() => setSettingsOpen(false)}
          settings={settingsHook.settings}
          onUpdateSettings={settingsHook.updateSettings}
          onTestProvider={settingsHook.testProvider}
          settingsLoading={settingsHook.loading}
        />
      )}

      {/* Template editor modal */}
      {editingTemplateId && (
        <TemplateEditor
          templateId={editingTemplateId}
          getTemplate={templateHook.getTemplate}
          onSave={templateHook.updateTemplate}
          onClose={() => setEditingTemplateId(null)}
        />
      )}
    </TooltipProvider>
  );
}

