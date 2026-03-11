/**
 * @fileoverview Right sidebar — template browser and manager.
 *
 * Shows community and local templates in a searchable list.
 * Lets users preview, edit, delete, and drag templates into the chat.
 *
 * @module components/sidebar/right-sidebar
 * @license CC BY-NC 4.0 — {@link https://creativecommons.org/licenses/by-nc/4.0/}
 * @author Gurkirat Singh
 * @created 2026-02-28
 * @updated 2026-03-03
 */

import { useState, useEffect, useMemo } from "react";
import { Search, FileCode2, Globe, Plus, Trash2, Sparkles, FolderOpen, LayoutGrid, Pencil, Tag, ChevronDown, ChevronRight, X, Folder, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import type { TemplateMeta, Template } from "@shared/types";
import type { TemplateFilter } from "@/components/layout/right-icon-rail";

/** Props accepted by {@link RightSidebar}. */
interface RightSidebarProps {
  community: TemplateMeta[];
  local: TemplateMeta[];
  onCreateTemplate: (title: string, content: string, description?: string, category?: string) => Promise<Template>;
  onDeleteTemplate: (id: string) => Promise<void>;
  onEditTemplate?: (id: string) => void;
  loading: boolean;
  filter: TemplateFilter;
  externalCreate: boolean;
  onExternalCreateDone: () => void;
  onSyncCommunity?: () => Promise<void>;
  syncing?: boolean;
}

const filterLabels: Record<TemplateFilter, string> = {
  all: "All Templates",
  community: "Community",
  local: "My Templates",
};

const filterIcons: Record<TemplateFilter, React.ReactNode> = {
  all: <LayoutGrid className="w-3.5 h-3.5" />,
  community: <Globe className="w-3.5 h-3.5" />,
  local: <FolderOpen className="w-3.5 h-3.5" />,
};

const DEFAULT_CATEGORIES = ["general", "development", "communication", "writing", "data", "design"];

// ── Category tree helpers ─────────────────────────────────────────────────

interface CategoryNode {
  /** Segment name (e.g. "frontend"). */
  name: string;
  /** Full slash-separated path (e.g. "code/frontend"). */
  path: string;
  /** Child categories. */
  children: CategoryNode[];
  /** Templates directly in this category. */
  templates: TemplateMeta[];
}

/** Build a tree of categories from a flat list of templates. */
function buildCategoryTree(templates: TemplateMeta[]): CategoryNode {
  const root: CategoryNode = { name: "", path: "", children: [], templates: [] };

  for (const tmpl of templates) {
    const cat = tmpl.category || "uncategorized";
    const segments = cat.split("/").filter(Boolean);

    let node = root;
    let pathSoFar = "";

    for (const seg of segments) {
      pathSoFar = pathSoFar ? `${pathSoFar}/${seg}` : seg;
      let child = node.children.find((c) => c.name === seg);
      if (!child) {
        child = { name: seg, path: pathSoFar, children: [], templates: [] };
        node.children.push(child);
      }
      node = child;
    }
    node.templates.push(tmpl);
  }

  // Sort children alphabetically at every level
  function sortTree(n: CategoryNode) {
    n.children.sort((a, b) => a.name.localeCompare(b.name));
    n.templates.sort((a, b) => a.title.localeCompare(b.title));
    for (const c of n.children) sortTree(c);
  }
  sortTree(root);

  return root;
}

/** Count total templates in a node (including descendants). */
function countTemplates(node: CategoryNode): number {
  return node.templates.length + node.children.reduce((sum, c) => sum + countTemplates(c), 0);
}

// ── Category folder component ─────────────────────────────────────────────

interface CategoryFolderProps {
  node: CategoryNode;
  depth: number;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onEditTemplate?: (id: string) => void;
  onDeleteTemplate: (id: string) => Promise<void>;
  source: "local" | "community";
  onCreateInCategory?: (category: string) => void;
}

function CategoryFolder({
  node,
  depth,
  expandedFolders,
  onToggleFolder,
  onEditTemplate,
  onDeleteTemplate,
  source,
  onCreateInCategory,
}: CategoryFolderProps) {
  const isExpanded = expandedFolders.has(node.path);
  const total = countTemplates(node);

  return (
    <div>
      {/* Folder header */}
      <button
        onClick={() => onToggleFolder(node.path)}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-left hover:bg-white/4 transition-colors group"
        style={{ paddingLeft: `${12 + depth * 12}px` }}
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-zinc-600 shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />
        )}
        <Folder className="w-3 h-3 text-zinc-500 group-hover:text-primary/70 shrink-0" />
        <span className="text-[11px] text-zinc-400 group-hover:text-zinc-200 truncate flex-1 capitalize">
          {node.name}
        </span>
        <span className="text-[9px] text-zinc-600 bg-white/3 px-1 py-0.5 rounded shrink-0">{total}</span>
        {source === "local" && onCreateInCategory && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateInCategory(node.path);
            }}
            className="w-4 h-4 flex items-center justify-center rounded text-zinc-600 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            title={`Create template in ${node.path}`}
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
        )}
      </button>

      {/* Children */}
      {isExpanded && (
        <div>
          {/* Sub-folders */}
          {node.children.map((child) => (
            <CategoryFolder
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onEditTemplate={onEditTemplate}
              onDeleteTemplate={onDeleteTemplate}
              source={source}
              onCreateInCategory={onCreateInCategory}
            />
          ))}

          {/* Templates in this category */}
          {node.templates.map((t) => (
            <Tooltip key={t.id}>
              <TooltipTrigger asChild>
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/gtq-template", t.id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  className="group w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/4 transition-colors cursor-grab active:cursor-grabbing overflow-hidden"
                  style={{ paddingLeft: `${24 + depth * 12}px` }}
                >
                  {source === "community" ? (
                    <Globe className="w-3 h-3 text-zinc-600 group-hover:text-primary/70 shrink-0" />
                  ) : (
                    <FileCode2 className="w-3 h-3 text-zinc-600 group-hover:text-primary/70 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <span className="text-[11px] text-zinc-300 group-hover:text-white truncate block leading-snug">{t.title}</span>
                  </div>
                  {source === "local" && (
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {onEditTemplate && (
                        <button
                          onClick={() => onEditTemplate(t.id)}
                          className="w-5 h-5 flex items-center justify-center rounded text-zinc-600 hover:text-primary"
                          title="Edit template"
                        >
                          <Pencil className="w-2.5 h-2.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteTemplate(t.id)}
                        className="w-5 h-5 flex items-center justify-center rounded text-zinc-600 hover:text-red-400"
                        title="Delete template"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              {t.description && (
                <TooltipContent side="left" sideOffset={8} className="max-w-[220px] leading-relaxed">
                  {t.description}
                </TooltipContent>
              )}
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────

export function RightSidebar({
  community,
  local,
  onCreateTemplate,
  onDeleteTemplate,
  onEditTemplate,
  loading,
  filter,
  externalCreate,
  onExternalCreateDone,
  onSyncCommunity,
  syncing,
}: RightSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Derive existing categories from all templates
  const existingCategories = useMemo(() => {
    const cats = new Set(DEFAULT_CATEGORIES);
    for (const t of [...local, ...community]) {
      if (t.category) {
        cats.add(t.category);
        // Also add parent segments (e.g. "code" from "code/frontend")
        const parts = t.category.split("/");
        for (let i = 1; i < parts.length; i++) {
          cats.add(parts.slice(0, i).join("/"));
        }
      }
    }
    return Array.from(cats).sort();
  }, [local, community]);

  // Handle external create trigger
  useEffect(() => {
    if (externalCreate && !isCreating) {
      setIsCreating(true);
      onExternalCreateDone();
    }
  }, [externalCreate, isCreating, onExternalCreateDone]);

  const resetCreateForm = () => {
    setNewName("");
    setNewDescription("");
    setNewContent("");
    setNewCategory("general");
    setCustomCategory("");
    setShowCategoryPicker(false);
    setIsCreating(false);
  };

  const handleCreateTemplate = async () => {
    if (!newName.trim()) return;
    const category = customCategory.trim() || newCategory;
    const tmpl = await onCreateTemplate(
      newName.trim(),
      newContent.trim(),
      newDescription.trim() || undefined,
      category,
    );
    // Auto-expand the created category folder for immediate visibility
    if (category) {
      const parts = category.split("/");
      const newExpanded = new Set(expandedFolders);
      for (let i = 1; i <= parts.length; i++) {
        newExpanded.add(parts.slice(0, i).join("/"));
      }
      setExpandedFolders(newExpanded);
    }
    resetCreateForm();
    // Open the template editor so the user can write the prompt immediately
    onEditTemplate?.(tmpl.id);
  };

  const handleCreateInCategory = (category: string) => {
    setNewCategory(category);
    setCustomCategory("");
    setIsCreating(true);
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  // Filter templates by search
  const filteredCommunity = community.filter(
    (t) => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLocal = local.filter(
    (t) => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Build category trees
  const communityTree = useMemo(() => buildCategoryTree(filteredCommunity), [filteredCommunity]);
  const localTree = useMemo(() => buildCategoryTree(filteredLocal), [filteredLocal]);

  const showCommunity = filter === "all" || filter === "community";
  const showLocal = filter === "all" || filter === "local";

  // When searching, expand all folders
  useEffect(() => {
    if (searchQuery) {
      const allPaths = new Set<string>();
      const collectPaths = (node: CategoryNode) => {
        if (node.path) allPaths.add(node.path);
        node.children.forEach(collectPaths);
      };
      collectPaths(communityTree);
      collectPaths(localTree);
      setExpandedFolders(allPaths);
    }
  }, [searchQuery, communityTree, localTree]);

  return (
    <TooltipProvider delayDuration={400}>
    <div className="w-full h-full flex flex-col bg-[#0E0E10] text-zinc-300 border-l border-[#1A1A1E]">
      {/* Header */}
      <div className="px-4 pt-4 pb-1 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-zinc-400">{filterIcons[filter]}</span>
          <h2 className="text-sm font-semibold text-zinc-200">{filterLabels[filter]}</h2>
          <span className="ml-auto text-[10px] text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded-full">
            {filter === "community" ? community.length : filter === "local" ? local.length : community.length + local.length}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pb-2 shrink-0">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full bg-background-dark border border-[#1A1A1E] rounded-lg py-2 pl-8 pr-3 text-xs text-zinc-300 placeholder:text-zinc-600 focus:ring-1 focus:ring-primary/30 focus:border-primary/30 transition-all outline-none"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 w-3.5 h-3.5" />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-3 pb-2 shrink-0">
        <div className="flex gap-2">
          <div className="flex-1 bg-background-dark border border-[#1A1A1E] rounded-lg px-3 py-2 text-center">
            <p className="text-sm font-bold text-zinc-200">{community.length}</p>
            <p className="text-[9px] text-zinc-500 uppercase tracking-wide">Community</p>
          </div>
          <div className="flex-1 bg-background-dark border border-[#1A1A1E] rounded-lg px-3 py-2 text-center">
            <p className="text-sm font-bold text-zinc-200">{local.length}</p>
            <p className="text-[9px] text-zinc-500 uppercase tracking-wide">Mine</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-2 pb-4">
          {/* Community Templates */}
          {showCommunity && (
            <div className="mb-2">
              <div className="flex items-center justify-between px-3 py-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Community</h3>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-zinc-500">{filteredCommunity.length}</span>
                  {onSyncCommunity && (
                    <button
                      onClick={onSyncCommunity}
                      disabled={syncing}
                      className="w-5 h-5 flex items-center justify-center rounded-md text-zinc-500 hover:text-primary hover:bg-white/5 transition-colors disabled:opacity-40"
                      title="Sync community templates"
                    >
                      <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
                    </button>
                  )}
                </div>
              </div>
              {loading && (
                <p className="px-3 py-2 text-[11px] text-zinc-600 text-center">Loading…</p>
              )}
              {!loading && filteredCommunity.length === 0 && (
                <div className="px-3 py-4 text-center">
                  <Sparkles className="w-6 h-6 text-zinc-700 mx-auto mb-1.5" />
                  <p className="text-[11px] text-zinc-600">
                    {searchQuery ? "No matches" : "No community templates"}
                  </p>
                </div>
              )}
              {!loading && filteredCommunity.length > 0 && (
                <div>
                  {/* Render category tree for community */}
                  {communityTree.children.map((child) => (
                    <CategoryFolder
                      key={child.path}
                      node={child}
                      depth={0}
                      expandedFolders={expandedFolders}
                      onToggleFolder={toggleFolder}
                      onDeleteTemplate={onDeleteTemplate}
                      source="community"
                    />
                  ))}
                  {/* Templates at root level (no category) */}
                  {communityTree.templates.map((t) => (
                    <Tooltip key={t.id}>
                      <TooltipTrigger asChild>
                        <div
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("application/gtq-template", t.id);
                            e.dataTransfer.effectAllowed = "copy";
                          }}
                          className="group w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/4 transition-colors cursor-grab active:cursor-grabbing overflow-hidden"
                        >
                          <Globe className="w-3 h-3 text-zinc-600 group-hover:text-primary/70 shrink-0" />
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <span className="text-[11px] text-zinc-300 group-hover:text-white truncate block leading-snug">{t.title}</span>
                          </div>
                        </div>
                      </TooltipTrigger>
                      {t.description && (
                        <TooltipContent side="left" sideOffset={8} className="max-w-[220px] leading-relaxed">
                          {t.description}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          {showCommunity && showLocal && (
            <div className="mx-3 my-3 border-t border-[#1A1A1E]" />
          )}

          {/* Local Templates */}
          {showLocal && (
            <div>
              <div className="flex items-center justify-between px-3 py-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">My Templates</h3>
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-5 h-5 flex items-center justify-center rounded-md text-zinc-500 hover:text-primary hover:bg-white/5 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Create Form — with hierarchical category picker */}
              {isCreating && (
                <div className="mx-2 mb-3 bg-background-dark rounded-lg p-3 border border-[#1A1A1E] space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-zinc-400">New Template</span>
                    <button
                      onClick={resetCreateForm}
                      className="w-4 h-4 flex items-center justify-center text-zinc-600 hover:text-zinc-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Name */}
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateTemplate();
                      if (e.key === "Escape") resetCreateForm();
                    }}
                    placeholder="Template name *"
                    autoFocus
                    className="w-full bg-[#141416] border border-[#1A1A1E] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-primary/30"
                  />

                  {/* Description */}
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Short description"
                    className="w-full bg-[#141416] border border-[#1A1A1E] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-primary/30"
                  />

                  {/* Prompt content */}
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Prompt content... (you can also edit this after creating)"
                    rows={5}
                    className="w-full bg-[#141416] border border-[#1A1A1E] rounded-md px-2.5 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-primary/30 resize-none font-mono"
                  />

                  {/* Category selector with hierarchy */}
                  <div className="relative">
                    <button
                      onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                      className="w-full flex items-center justify-between bg-[#141416] border border-[#1A1A1E] rounded-md px-2.5 py-1.5 text-xs text-zinc-400 hover:border-primary/30 transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3 h-3" />
                        <span className="truncate">{customCategory || newCategory}</span>
                      </span>
                      <ChevronDown className="w-3 h-3 shrink-0" />
                    </button>

                    {showCategoryPicker && (
                      <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-[#141416] border border-[#1A1A1E] rounded-lg shadow-xl overflow-hidden">
                        <div className="max-h-40 overflow-y-auto">
                          {existingCategories.map((cat) => (
                            <button
                              key={cat}
                              onClick={() => {
                                setNewCategory(cat);
                                setCustomCategory("");
                                setShowCategoryPicker(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-white/5 transition-colors flex items-center gap-1.5 ${
                                newCategory === cat && !customCategory ? "text-primary" : "text-zinc-400"
                              }`}
                            >
                              <Folder className="w-3 h-3 shrink-0" />
                              <span className="truncate">{cat}</span>
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-[#1A1A1E] p-2">
                          <input
                            type="text"
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            placeholder="+ New category (e.g. code/frontend)"
                            className="w-full bg-transparent text-[11px] text-zinc-300 placeholder:text-zinc-600 outline-none"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && customCategory.trim()) {
                                setShowCategoryPicker(false);
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 justify-end pt-1">
                    <button
                      onClick={resetCreateForm}
                      className="px-2.5 py-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateTemplate}
                      disabled={!newName.trim()}
                      className="px-2.5 py-1 text-[10px] bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Create
                    </button>
                  </div>
                </div>
              )}

              {!loading && filteredLocal.length === 0 && !isCreating && (
                <div className="px-3 py-4 text-center">
                  <FolderOpen className="w-6 h-6 text-zinc-700 mx-auto mb-1.5" />
                  <p className="text-[11px] text-zinc-600 mb-2">
                    {searchQuery ? "No matches" : "No templates yet"}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => setIsCreating(true)}
                      className="text-[11px] text-primary hover:underline"
                    >
                      Create your first template
                    </button>
                  )}
                </div>
              )}

              {!loading && filteredLocal.length > 0 && (
                <div>
                  {/* Render category tree for local */}
                  {localTree.children.map((child) => (
                    <CategoryFolder
                      key={child.path}
                      node={child}
                      depth={0}
                      expandedFolders={expandedFolders}
                      onToggleFolder={toggleFolder}
                      onEditTemplate={onEditTemplate}
                      onDeleteTemplate={onDeleteTemplate}
                      source="local"
                      onCreateInCategory={handleCreateInCategory}
                    />
                  ))}
                  {/* Templates at root level (no category) */}
                  {localTree.templates.map((t) => (
                    <Tooltip key={t.id}>
                      <TooltipTrigger asChild>
                        <div
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("application/gtq-template", t.id);
                            e.dataTransfer.effectAllowed = "copy";
                          }}
                          className="group w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/4 transition-colors cursor-grab active:cursor-grabbing overflow-hidden"
                        >
                          <FileCode2 className="w-3 h-3 text-zinc-600 group-hover:text-primary/70 shrink-0" />
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <span className="text-[11px] text-zinc-300 group-hover:text-white truncate block leading-snug">{t.title}</span>
                          </div>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            {onEditTemplate && (
                              <button
                                onClick={() => onEditTemplate(t.id)}
                                className="w-5 h-5 flex items-center justify-center rounded text-zinc-600 hover:text-primary"
                                title="Edit template"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
                            )}
                            <button
                              onClick={() => onDeleteTemplate(t.id)}
                              className="w-5 h-5 flex items-center justify-center rounded text-zinc-600 hover:text-red-400"
                              title="Delete template"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      </TooltipTrigger>
                      {t.description && (
                        <TooltipContent side="left" sideOffset={8} className="max-w-[220px] leading-relaxed">
                          {t.description}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
    </TooltipProvider>
  );
}
