/**
 * @fileoverview Dashboard page — main app shell.
 *
 * Composes the icon rail, sidebars, chat area, and settings overlay.
 * Owns the top-level hooks for sessions, templates, and settings,
 * and threads data down to child components.
 *
 * @module pages/dashboard
 * @license CC BY-NC 4.0 — {@link https://creativecommons.org/licenses/by-nc/4.0/}
 * @author Gurkirat Singh
 * @created 2026-02-25
 * @updated 2026-03-03
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { IconRail } from "@/components/layout/icon-rail";
import { RightIconRail } from "@/components/layout/right-icon-rail";
import type { TemplateFilter } from "@/components/layout/right-icon-rail";
import { LeftSidebar } from "@/components/sidebar/left-sidebar";
import { ChatArea } from "@/components/chat/chat-area";
import { RightSidebar } from "@/components/sidebar/right-sidebar";
import { TemplateEditor } from "@/components/templates/template-editor";
import { SettingsOverlay } from "@/components/settings/settings-overlay";
import { ConfigPanel } from "@/components/settings/config-panel";
import { useSessions } from "@/hooks/use-sessions";
import { useTemplates } from "@/hooks/use-templates";
import { useSettings } from "@/hooks/use-settings";
import type { Project, AttachedDocument } from "@shared/types";

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
const PROJECTS_STORAGE_KEY = "gtq_projects";

/** Load projects from localStorage. */
function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save projects to localStorage. */
function saveProjects(projects: Project[]) {
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
}

export function Dashboard() {
  const [panels, setPanels] = useState<PanelState>({ left: false, right: false });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [templateFilter, setTemplateFilter] = useState<TemplateFilter>("all");
  const [triggerCreate, setTriggerCreate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [nextColorIdx, setNextColorIdx] = useState(0);
  const [documents, setDocuments] = useState<AttachedDocument[]>([]);

  const sessionHook = useSessions();
  const templateHook = useTemplates();
  const settingsHook = useSettings();

  /** Keep session hook's settings ref in sync with latest settings. */
  useEffect(() => {
    sessionHook.setSettings(settingsHook.settings);
  }, [settingsHook.settings, sessionHook.setSettings]);

  /** Keep session hook's documents ref in sync. */
  useEffect(() => {
    sessionHook.setDocuments(documents);
  }, [documents, sessionHook.setDocuments]);

  /** Persist projects to localStorage when they change. */
  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  /** Resolve the active template name from the session's templateId. */
  const activeTemplateName = useMemo(() => {
    const tid = sessionHook.activeSession?.templateId;
    if (!tid) return null;
    const all = [...templateHook.community, ...templateHook.local];
    return all.find((t) => t.id === tid)?.title ?? tid;
  }, [sessionHook.activeSession?.templateId, templateHook.community, templateHook.local]);

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

  /** Rename a project. */
  const handleRenameProject = useCallback((id: string, name: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p))
    );
  }, []);

  /** Move a session into or out of a project. */
  const handleMoveSession = useCallback((sessionId: string, projectId: string | null) => {
    sessionHook.moveSession(sessionId, projectId);
  }, [sessionHook]);

  return (
    <TooltipProvider>
      <div className="h-screen w-screen bg-background-dark flex overflow-hidden">
        {/* Left icon rail — chats, new chat, settings */}
        <IconRail
          chatsOpen={panels.left}
          projectsOpen={panels.left}
          onToggleChats={() => { setConfigPanelOpen(false); togglePanel("left"); }}
          onToggleProjects={() => { setConfigPanelOpen(false); togglePanel("left"); }}
          onSettingsClick={() => setSettingsOpen(true)}
          onNewChat={async () => { await sessionHook.createSession(); }}
          configOpen={configPanelOpen}
          onToggleConfig={() => {
            if (configPanelOpen) {
              setConfigPanelOpen(false);
            } else {
              setPanels((prev) => ({ ...prev, left: false }));
              setConfigPanelOpen(true);
            }
          }}
        />

        {/* Left sidebar — sessions / recent chats */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            panels.left || configPanelOpen ? "w-72" : "w-0"
          }`}
        >
          <div className="w-72 h-full">
            {configPanelOpen ? (
              <ConfigPanel
                settings={settingsHook.settings}
                onUpdateSettings={settingsHook.updateSettings}
              />
            ) : (
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
                onRenameProject={handleRenameProject}
                onMoveSession={handleMoveSession}
              />
            )}
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
            onUpdateSettings={settingsHook.updateSettings}
            onOpenSettings={() => setSettingsOpen(true)}
            onRegenerate={sessionHook.regenerateLastResponse}
            onExpand={sessionHook.expandLastResponse}
            onRefine={sessionHook.refineLastResponse}
            onStop={sessionHook.stopGeneration}
            documents={documents}
            onDocumentsChange={setDocuments}
            onEditMessage={sessionHook.editMessage}
            onDeleteMessage={sessionHook.deleteMessage}
            onSaveAsTemplate={async (content) => {
              const tmpl = await templateHook.createTemplate("Untitled Template", content, "", "general");
              setEditingTemplateId(tmpl.id);
            }}
            onApplyTemplate={async (templateId) => {
              await sessionHook.createSession(undefined, templateId);
            }}
            activeTemplateName={activeTemplateName}
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
              onSyncCommunity={async () => { await templateHook.syncCommunity(); }}
              syncing={templateHook.syncing}
            />
          </div>
        </div>

        {/* Right icon rail — templates + config */}
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

