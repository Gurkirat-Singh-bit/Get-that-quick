import { useState } from "react";
import { Search, FolderOpen, FolderClosed, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

type Chat = {
  id: string;
  title: string;
  preview: string;
  time: string;
};

type Project = {
  id: string;
  name: string;
  chats: Chat[];
};

const projects: Project[] = [
  {
    id: "p1",
    name: "GetThatQuick",
    chats: [
      { id: "p1c1", title: "Auth Flow Refactor", preview: "Refactoring the authentication middleware...", time: "2m ago" },
      { id: "p1c2", title: "API Docs Generator", preview: "Generate OpenAPI spec from route handlers", time: "1h ago" },
      { id: "p1c3", title: "Docker Config", preview: "Multi-stage build for the monorepo", time: "3h ago" },
    ],
  },
  {
    id: "p2",
    name: "Side Project",
    chats: [
      { id: "p2c1", title: "Landing Page Copy", preview: "Write hero section and CTA text", time: "1d ago" },
      { id: "p2c2", title: "Logo Brainstorm", preview: "Color palette and typography ideas", time: "2d ago" },
    ],
  },
];

const standaloneChats: Chat[] = [
  { id: "c1", title: "DB Migration Plan", preview: "Plan migration from Postgres to SQLite", time: "3h ago" },
  { id: "c2", title: "Code Review Request", preview: "Review the new caching layer implementation", time: "1d ago" },
  { id: "c3", title: "Quick Regex Help", preview: "Match email pattern with lookahead", time: "2d ago" },
  { id: "c4", title: "Deployment Checklist", preview: "Pre-prod sanity check items", time: "3d ago" },
];

export function LeftSidebar() {
  const [activeChatId, setActiveChatId] = useState("p1c1");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(["p1"]));

  const toggleProject = (id: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const matchesSearch = (chat: Chat) =>
    !searchQuery || chat.title.toLowerCase().includes(searchQuery.toLowerCase());

  const matchesProjectName = (project: Project) =>
    !searchQuery || project.name.toLowerCase().includes(searchQuery.toLowerCase());

  const filteredProjects = projects
    .map((p) => ({
      ...p,
      chats: matchesProjectName(p) ? p.chats : p.chats.filter(matchesSearch),
    }))
    .filter((p) => p.chats.length > 0);

  const filteredChats = standaloneChats.filter(matchesSearch);

  return (
    <div className="w-72 h-full flex flex-col bg-[#252525] text-slate-300 border-r border-[#333]">
      {/* Search */}
      <div className="p-3 pb-2">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="w-full bg-[#1E1E1E] border border-[#333] rounded-lg py-2 pl-8 pr-3 text-xs text-slate-300 placeholder:text-slate-600 focus:ring-1 focus:ring-primary/30 focus:border-primary/30 transition-all outline-none"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 w-3.5 h-3.5" />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-4">
          {/* Projects Section */}
          {filteredProjects.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center justify-between px-3 py-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  Projects
                </h3>
                <button className="w-5 h-5 flex items-center justify-center rounded-md text-slate-600 hover:text-primary hover:bg-white/5 transition-colors">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              {filteredProjects.map((project) => {
                const isExpanded = expandedProjects.has(project.id);
                return (
                  <div key={project.id} className="mb-0.5">
                    <button
                      onClick={() => toggleProject(project.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-white/4 hover:text-slate-200 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3 shrink-0 text-slate-600" />
                      ) : (
                        <ChevronRight className="w-3 h-3 shrink-0 text-slate-600" />
                      )}
                      {isExpanded ? (
                        <FolderOpen className="w-3.5 h-3.5 shrink-0 text-primary/60 transition-transform" />
                      ) : (
                        <FolderClosed className="w-3.5 h-3.5 shrink-0 text-primary/60 transition-transform" />
                      )}
                      <span className="truncate">{project.name}</span>
                      <span className="text-[10px] text-slate-600 ml-auto shrink-0">
                        {project.chats.length}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="ml-4 border-l border-[#333] pl-2 space-y-0.5 mt-0.5">
                        {project.chats.map((chat) => (
                          <button
                            key={chat.id}
                            onClick={() => setActiveChatId(chat.id)}
                            className={cn(
                              "w-full px-3 py-2 rounded-lg text-left transition-colors",
                              activeChatId === chat.id
                                ? "bg-white/8 text-white"
                                : "text-slate-400 hover:bg-white/4 hover:text-slate-200"
                            )}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[11px] font-medium truncate pr-2">{chat.title}</span>
                              <span className="text-[9px] text-slate-600 shrink-0">{chat.time}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">{chat.preview}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Chats Section */}
          {filteredChats.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-3 py-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  Chats
                </h3>
                <button className="w-5 h-5 flex items-center justify-center rounded-md text-slate-600 hover:text-primary hover:bg-white/5 transition-colors">
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-0.5">
                {filteredChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setActiveChatId(chat.id)}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-lg text-left transition-colors",
                      activeChatId === chat.id
                        ? "bg-white/8 text-white"
                        : "text-slate-400 hover:bg-white/4 hover:text-slate-200"
                    )}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium truncate pr-2">{chat.title}</span>
                      <span className="text-[10px] text-slate-600 shrink-0">{chat.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{chat.preview}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
