/**
 * @fileoverview Left sidebar — sessions grouped by projects, with drag-and-drop.
 *
 * Sessions can be ungrouped or assigned to a project.
 * Drag a chat onto a project header to add it.
 *
 * @module components/sidebar/left-sidebar
 */

import { useState, useRef, useEffect, type DragEvent } from "react";
import {
  Search, Plus, Trash2, MessageCircle,
  ChevronDown, ChevronRight, GripVertical, FolderPlus,
  Pencil, Check, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SessionMeta, Project } from "@shared/types";

/** Props accepted by {@link LeftSidebar}. */
interface LeftSidebarProps {
  sessions: SessionMeta[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: (title?: string) => Promise<void>;
  onDeleteSession: (id: string) => Promise<void>;
  /** Rename a session. */
  onRenameSession: (id: string, title: string) => Promise<void>;
  loading: boolean;
  /** Local projects list. */
  projects: Project[];
  /** Create a new project. */
  onCreateProject: (name: string) => void;
  /** Delete a project. */
  onDeleteProject: (id: string) => void;
  /** Move a session into a project (null = ungrouped). */
  onMoveSession: (sessionId: string, projectId: string | null) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const PROJECT_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#f97316"];

/** A single session row — draggable, with inline rename. */
function SessionRow({
  session,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: {
  session: SessionMeta;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(session.title);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const handleSave = async () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === session.title) {
      setEditing(false);
      setEditValue(session.title);
      return;
    }
    setSaving(true);
    try {
      await onRename(trimmed);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(session.title);
    setEditing(false);
  };

  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer.setData("text/plain", session.id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable={!editing}
      onDragStart={handleDragStart}
      onClick={() => { if (!editing) onSelect(); }}
      className={cn(
        "group w-full px-3 py-2 rounded-lg text-left transition-colors flex items-center gap-2",
        editing ? "bg-white/8" : "cursor-grab active:cursor-grabbing",
        isActive
          ? "bg-white/8 text-white"
          : "text-zinc-400 hover:bg-white/4 hover:text-zinc-200"
      )}
    >
      <GripVertical className={cn(
        "w-3 h-3 text-zinc-700 shrink-0 transition-opacity",
        editing ? "opacity-0" : "opacity-0 group-hover:opacity-100"
      )} />

      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
              onBlur={handleSave}
              disabled={saving}
              className="w-full bg-[#0A0A0B] border border-primary/40 rounded px-1.5 py-0.5 text-xs text-zinc-200 outline-none focus:border-primary/60"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => { e.stopPropagation(); handleSave(); }}
              className="w-4 h-4 flex items-center justify-center text-emerald-400 hover:text-emerald-300 shrink-0"
              aria-label="Save name"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleCancel(); }}
              className="w-4 h-4 flex items-center justify-center text-zinc-500 hover:text-zinc-300 shrink-0"
              aria-label="Cancel editing"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs font-medium truncate pr-2">{session.title}</span>
              <span className="text-[10px] text-zinc-600 shrink-0">{timeAgo(session.updatedAt)}</span>
            </div>
            <p className="text-[11px] text-zinc-500 truncate">
              {session.messageCount} message{session.messageCount !== 1 ? "s" : ""}
            </p>
          </>
        )}
      </div>

      {!editing && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true); setEditValue(session.title); }}
            className="w-4 h-4 flex items-center justify-center rounded text-zinc-700 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            title="Rename chat"
            aria-label="Rename chat"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-5 h-5 flex items-center justify-center rounded text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            title="Delete chat"
            aria-label="Delete chat"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </>
      )}
    </div>
  );
}

export function LeftSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onRenameSession,
  loading,
  projects,
  onCreateProject,
  onDeleteProject,
  onMoveSession,
}: LeftSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const nextColor = useRef(0);

  const filtered = sessions.filter(
    (s) => !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ungrouped = filtered.filter((s) => !s.projectId);
  const grouped = (projectId: string) => filtered.filter((s) => s.projectId === projectId);

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    onCreateProject(newProjectName.trim());
    setNewProjectName("");
    setCreatingProject(false);
    nextColor.current = (nextColor.current + 1) % PROJECT_COLORS.length;
  };

  const handleDrop = (e: DragEvent, projectId: string | null) => {
    e.preventDefault();
    const sessionId = e.dataTransfer.getData("text/plain");
    if (sessionId) onMoveSession(sessionId, projectId);
    setDragOverTarget(null);
  };

  const handleDragOver = (e: DragEvent, target: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverTarget(target);
  };

  return (
    <div className="w-72 h-full flex flex-col bg-[#0E0E10] text-zinc-300 border-r border-[#1A1A1E]">
      {/* Search */}
      <div className="p-3 pb-2 shrink-0">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="w-full bg-[#0A0A0B] border border-[#1A1A1E] rounded-lg py-2 pl-8 pr-3 text-xs text-zinc-300 placeholder:text-zinc-600 focus:ring-1 focus:ring-primary/30 focus:border-primary/30 transition-all outline-none"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 w-3.5 h-3.5" />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-4">
          {/* Projects Section */}
          {projects.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center justify-between px-3 py-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Projects</h3>
                <button
                  onClick={() => setCreatingProject(true)}
                  className="w-5 h-5 flex items-center justify-center rounded-md text-zinc-500 hover:text-primary hover:bg-white/5 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {projects.map((project) => {
                const isCollapsed = collapsed[project.id] ?? false;
                const projectSessions = grouped(project.id);
                const isDropTarget = dragOverTarget === project.id;

                return (
                  <div key={project.id} className="mb-1">
                    {/* Project header — drop target */}
                    <div
                      onDragOver={(e) => handleDragOver(e, project.id)}
                      onDragLeave={() => setDragOverTarget(null)}
                      onDrop={(e) => handleDrop(e, project.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all group",
                        isDropTarget
                          ? "bg-primary/10 border border-primary/30 border-dashed"
                          : "hover:bg-white/4"
                      )}
                      onClick={() => setCollapsed((c) => ({ ...c, [project.id]: !isCollapsed }))}
                    >
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: project.color }} />
                      {isCollapsed ? (
                        <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-zinc-600 shrink-0" />
                      )}
                      <span className="text-[11px] font-medium text-zinc-300 flex-1 truncate">{project.name}</span>
                      <span className="text-[9px] text-zinc-600">{projectSessions.length}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
                        className="w-4 h-4 flex items-center justify-center rounded text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    {/* Project sessions */}
                    {!isCollapsed && (
                      <div className="pl-3 space-y-0.5 mt-0.5">
                        {projectSessions.map((session) => (
                          <SessionRow
                            key={session.id}
                            session={session}
                            isActive={activeSessionId === session.id}
                            onSelect={() => onSelectSession(session.id)}
                            onDelete={() => onDeleteSession(session.id)}
                            onRename={(title) => onRenameSession(session.id, title)}
                          />
                        ))}
                        {projectSessions.length === 0 && (
                          <p className="text-[10px] text-zinc-600 px-3 py-1.5 italic">
                            Drag chats here
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="mx-3 my-2 border-t border-[#1A1A1E]" />
            </div>
          )}

          {/* Create Project inline */}
          {creatingProject && (
            <div className="mx-2 mb-2 bg-[#0A0A0B] rounded-lg p-2 border border-[#1A1A1E]">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateProject();
                  if (e.key === "Escape") { setCreatingProject(false); setNewProjectName(""); }
                }}
                placeholder="Project name..."
                autoFocus
                className="w-full bg-transparent text-xs text-zinc-300 placeholder:text-zinc-600 outline-none mb-2"
              />
              <div className="flex gap-1.5 justify-end">
                <button
                  onClick={() => { setCreatingProject(false); setNewProjectName(""); }}
                  className="px-2 py-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  className="px-2 py-1 text-[10px] bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          )}

          {/* Ungrouped Chats -- also a drop zone to remove from project */}
          <div
            onDragOver={(e) => handleDragOver(e, "__ungrouped__")}
            onDragLeave={() => setDragOverTarget(null)}
            onDrop={(e) => handleDrop(e, null)}
          >
            <div className="flex items-center justify-between px-3 py-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Chats
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCreatingProject(true)}
                  className="w-5 h-5 flex items-center justify-center rounded-md text-zinc-500 hover:text-primary hover:bg-white/5 transition-colors"
                  title="New project"
                >
                  <FolderPlus className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onCreateSession()}
                  className="w-5 h-5 flex items-center justify-center rounded-md text-zinc-500 hover:text-primary hover:bg-white/5 transition-colors"
                  title="New chat"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {loading && (
              <p className="px-3 py-4 text-[11px] text-zinc-600 text-center">Loading…</p>
            )}

            {!loading && ungrouped.length === 0 && projects.length === 0 && (
              <div className="px-3 py-8 text-center">
                <MessageCircle className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p className="text-[11px] text-zinc-600">No chats yet</p>
                <button
                  onClick={() => onCreateSession()}
                  className="mt-2 text-[11px] text-primary hover:underline"
                >
                  Start a new chat
                </button>
              </div>
            )}

            <div className={cn(
              "space-y-0.5 rounded-lg transition-colors",
              dragOverTarget === "__ungrouped__" && "bg-primary/5"
            )}>
              {ungrouped.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  isActive={activeSessionId === session.id}
                  onSelect={() => onSelectSession(session.id)}
                  onDelete={() => onDeleteSession(session.id)}
                  onRename={(title) => onRenameSession(session.id, title)}
                />
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
