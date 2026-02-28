import { useState, useEffect } from "react";
import { Search, FileCode2, Globe, Plus, Trash2, Sparkles, FolderOpen, LayoutTemplate, Pencil, Tag, ChevronDown, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
}

const filterLabels: Record<TemplateFilter, string> = {
  all: "All Templates",
  community: "Community",
  local: "My Templates",
};

const filterIcons: Record<TemplateFilter, React.ReactNode> = {
  all: <LayoutTemplate className="w-3.5 h-3.5" />,
  community: <Globe className="w-3.5 h-3.5" />,
  local: <FolderOpen className="w-3.5 h-3.5" />,
};

const DEFAULT_CATEGORIES = ["general", "development", "communication", "writing", "data", "design"];

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
}: RightSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [customCategory, setCustomCategory] = useState("");

  // Derive existing categories from local templates
  const existingCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...local.map((t) => t.category).filter(Boolean)])
  );

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
    setNewCategory("general");
    setCustomCategory("");
    setShowCategoryPicker(false);
    setIsCreating(false);
  };

  const handleCreateTemplate = async () => {
    if (!newName.trim()) return;
    const category = customCategory.trim() || newCategory;
    await onCreateTemplate(
      newName.trim(),
      "New custom template prompt — edit to customize",
      newDescription.trim() || undefined,
      category
    );
    resetCreateForm();
  };

  const filteredCommunity = community.filter(
    (t) => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLocal = local.filter(
    (t) => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showCommunity = filter === "all" || filter === "community";
  const showLocal = filter === "all" || filter === "local";

  return (
    <div className="w-72 h-full flex flex-col bg-[#0E0E10] text-zinc-300 border-l border-[#1A1A1E]">
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
            className="w-full bg-[#0A0A0B] border border-[#1A1A1E] rounded-lg py-2 pl-8 pr-3 text-xs text-zinc-300 placeholder:text-zinc-600 focus:ring-1 focus:ring-primary/30 focus:border-primary/30 transition-all outline-none"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600 w-3.5 h-3.5" />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-3 pb-2 shrink-0">
        <div className="flex gap-2">
          <div className="flex-1 bg-[#0A0A0B] border border-[#1A1A1E] rounded-lg px-3 py-2 text-center">
            <p className="text-sm font-bold text-zinc-200">{community.length}</p>
            <p className="text-[9px] text-zinc-500 uppercase tracking-wide">Community</p>
          </div>
          <div className="flex-1 bg-[#0A0A0B] border border-[#1A1A1E] rounded-lg px-3 py-2 text-center">
            <p className="text-sm font-bold text-zinc-200">{local.length}</p>
            <p className="text-[9px] text-zinc-500 uppercase tracking-wide">Mine</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-4">
          {/* Community Templates */}
          {showCommunity && (
            <div className="mb-2">
              <div className="flex items-center justify-between px-3 py-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Community</h3>
                <span className="text-[9px] text-zinc-500">{filteredCommunity.length}</span>
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
              <div className="space-y-0.5">
                {filteredCommunity.map((t) => (
                  <button
                    key={t.id}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-[11px] text-zinc-400 hover:bg-white/4 hover:text-zinc-200 transition-colors group"
                  >
                    <Globe className="w-3 h-3 text-zinc-600 group-hover:text-primary/70 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-zinc-300 group-hover:text-white truncate block">{t.title}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-600 truncate">{t.description}</span>
                        <span className="text-[9px] text-zinc-700 bg-white/3 px-1 py-0.5 rounded shrink-0">{t.category}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
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

              {/* Create Form — improved with name, description, category */}
              {isCreating && (
                <div className="mx-2 mb-3 bg-[#0A0A0B] rounded-lg p-3 border border-[#1A1A1E] space-y-2">
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

                  {/* Category selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                      className="w-full flex items-center justify-between bg-[#141416] border border-[#1A1A1E] rounded-md px-2.5 py-1.5 text-xs text-zinc-400 hover:border-primary/30 transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3 h-3" />
                        {customCategory || newCategory}
                      </span>
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    {showCategoryPicker && (
                      <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-[#141416] border border-[#1A1A1E] rounded-lg shadow-xl overflow-hidden">
                        <div className="max-h-32 overflow-y-auto">
                          {existingCategories.map((cat) => (
                            <button
                              key={cat}
                              onClick={() => {
                                setNewCategory(cat);
                                setCustomCategory("");
                                setShowCategoryPicker(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-white/5 transition-colors ${
                                newCategory === cat && !customCategory ? "text-primary" : "text-zinc-400"
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-[#1A1A1E] p-2">
                          <input
                            type="text"
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            placeholder="+ New category..."
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

              <div className="space-y-0.5">
                {filteredLocal.map((t) => (
                  <div
                    key={t.id}
                    className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/4 transition-colors"
                  >
                    <FileCode2 className="w-3 h-3 text-zinc-600 group-hover:text-primary/70 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-zinc-300 group-hover:text-white truncate block">{t.title}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-600 truncate">{t.description}</span>
                        <span className="text-[9px] text-zinc-700 bg-white/3 px-1 py-0.5 rounded shrink-0">{t.category}</span>
                      </div>
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
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
