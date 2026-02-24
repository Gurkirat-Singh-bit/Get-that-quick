import { useState } from "react";
import { Search, ChevronDown, ChevronRight, Code, Bug, Shield, PenTool, FileText, Users, RefreshCw, Plus, Trash2, Edit3 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type TemplateItem = {
  id: string;
  name: string;
};

type SubCategory = {
  id: string;
  name: string;
  templates: TemplateItem[];
};

type Category = {
  id: string;
  name: string;
  icon: React.ElementType;
  subcategories: SubCategory[];
};

const communityCategories: Category[] = [
  {
    id: "coding",
    name: "Coding",
    icon: Code,
    subcategories: [
      {
        id: "frontend",
        name: "Frontend",
        templates: [
          { id: "ct1", name: "React Component Generator" },
          { id: "ct2", name: "CSS to Tailwind Converter" },
        ],
      },
      {
        id: "backend",
        name: "Backend",
        templates: [
          { id: "ct3", name: "API Endpoint Scaffold" },
          { id: "ct4", name: "Database Query Optimizer" },
        ],
      },
      {
        id: "devops",
        name: "DevOps",
        templates: [
          { id: "ct5", name: "Dockerfile Generator" },
          { id: "ct6", name: "CI/CD Pipeline Config" },
        ],
      },
    ],
  },
  {
    id: "debugging",
    name: "Bug Solving",
    icon: Bug,
    subcategories: [
      {
        id: "bug-report",
        name: "Bug Reports",
        templates: [
          { id: "ct7", name: "Detailed Bug Report" },
          { id: "ct8", name: "Reproduction Steps" },
        ],
      },
      {
        id: "troubleshoot",
        name: "Troubleshooting",
        templates: [
          { id: "ct9", name: "Error Analysis" },
          { id: "ct10", name: "Performance Debug" },
        ],
      },
    ],
  },
  {
    id: "security",
    name: "Cybersecurity",
    icon: Shield,
    subcategories: [
      {
        id: "audit",
        name: "Auditing",
        templates: [
          { id: "ct11", name: "Code Security Review" },
          { id: "ct12", name: "Dependency Audit" },
        ],
      },
    ],
  },
  {
    id: "writing",
    name: "Writing",
    icon: PenTool,
    subcategories: [
      {
        id: "docs",
        name: "Documentation",
        templates: [
          { id: "ct13", name: "README Generator" },
          { id: "ct14", name: "API Docs Template" },
        ],
      },
      {
        id: "email",
        name: "Emails",
        templates: [{ id: "ct15", name: "Professional Email Draft" }],
      },
    ],
  },
];

type LocalTemplate = {
  id: string;
  name: string;
  description: string;
};

const initialLocalTemplates: LocalTemplate[] = [
  { id: "lt1", name: "Code Review Request", description: "Generate a structured code review prompt" },
  { id: "lt2", name: "Meeting Summary", description: "Summarize meeting notes into action items" },
  { id: "lt3", name: "Bug Report (Custom)", description: "Custom bug report format for our team" },
];

function CategoryTree({
  categories,
  searchQuery,
}: {
  categories: Category[];
  searchQuery: string;
}) {
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(["coding"]));
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set(["frontend"]));

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const matches = (name: string) =>
    !searchQuery || name.toLowerCase().includes(searchQuery.toLowerCase());

  return (
    <>
      {categories.map((cat) => {
        const Icon = cat.icon;
        const isCatExpanded = expandedCats.has(cat.id);
        const filteredSubs = cat.subcategories
          .map((sub) => ({
            ...sub,
            templates: sub.templates.filter((t) => matches(t.name)),
          }))
          .filter((sub) => sub.templates.length > 0 || matches(sub.name));

        if (searchQuery && filteredSubs.length === 0) return null;

        return (
          <div key={cat.id} className="mb-0.5">
            <button
              onClick={() => setExpandedCats((s) => toggle(s, cat.id))}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-white/4 hover:text-slate-200 transition-colors"
            >
              {isCatExpanded ? <ChevronDown className="w-3 h-3 text-slate-600" /> : <ChevronRight className="w-3 h-3 text-slate-600" />}
              <Icon className="w-3.5 h-3.5 text-primary/70" />
              <span className="truncate">{cat.name}</span>
              <span className="text-[10px] text-slate-600 ml-auto">
                {cat.subcategories.reduce((a, s) => a + s.templates.length, 0)}
              </span>
            </button>
            {isCatExpanded && (
              <div className="ml-4 border-l border-[#333] pl-1 mt-0.5">
                {(searchQuery ? filteredSubs : cat.subcategories).map((sub) => {
                  const isSubExpanded = expandedSubs.has(sub.id);
                  const visible = searchQuery ? sub.templates.filter((t) => matches(t.name)) : sub.templates;
                  return (
                    <div key={sub.id} className="mb-0.5">
                      <button
                        onClick={() => setExpandedSubs((s) => toggle(s, sub.id))}
                        className="w-full flex items-center gap-2 px-2 py-1 rounded-md text-[11px] text-slate-500 hover:bg-white/4 hover:text-slate-300 transition-colors"
                      >
                        {isSubExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                        <span className="truncate">{sub.name}</span>
                        <span className="text-[9px] text-slate-600 ml-auto">{visible.length}</span>
                      </button>
                      {isSubExpanded && (
                        <div className="ml-4 space-y-0.5 mt-0.5">
                          {visible.map((t) => (
                            <button
                              key={t.id}
                              className="w-full flex items-center gap-2 px-2 py-1 rounded-md text-[11px] text-slate-400 hover:bg-white/6 hover:text-slate-200 transition-colors group text-left"
                            >
                              <Users className="w-2.5 h-2.5 text-slate-600 group-hover:text-primary/70 shrink-0" />
                              <span className="truncate">{t.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

export function RightSidebar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [localTemplates, setLocalTemplates] = useState(initialLocalTemplates);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreateTemplate = () => {
    if (!newName.trim()) return;
    setLocalTemplates((prev) => [
      ...prev,
      { id: `lt${Date.now()}`, name: newName.trim(), description: "New custom template" },
    ]);
    setNewName("");
    setIsCreating(false);
  };

  const handleDeleteLocal = (id: string) => {
    setLocalTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const filteredLocal = localTemplates.filter(
    (t) => !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-72 h-full flex flex-col bg-[#252525] text-slate-300 border-l border-[#333]">
      {/* Search */}
      <div className="p-3 pb-2 shrink-0">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full bg-[#1E1E1E] border border-[#333] rounded-lg py-2 pl-8 pr-3 text-xs text-slate-300 placeholder:text-slate-600 focus:ring-1 focus:ring-primary/30 focus:border-primary/30 transition-all outline-none"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 w-3.5 h-3.5" />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-4">
          {/* Community Templates */}
          <div className="mb-2">
            <div className="flex items-center justify-between px-3 py-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                Community
              </h3>
              <button className="flex items-center gap-1 text-[9px] text-slate-600 hover:text-primary transition-colors">
                <RefreshCw className="w-2.5 h-2.5" />
                Sync
              </button>
            </div>
            <CategoryTree categories={communityCategories} searchQuery={searchQuery} />
          </div>

          {/* Divider */}
          <div className="mx-3 my-3 border-t border-[#3a3a3a]" />

          {/* Local Templates */}
          <div>
            <div className="flex items-center justify-between px-3 py-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                Local Templates
              </h3>
              <button
                onClick={() => setIsCreating(true)}
                className="w-5 h-5 flex items-center justify-center rounded-md text-slate-600 hover:text-primary hover:bg-white/5 transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {isCreating && (
              <div className="mx-2 mb-2 bg-[#1E1E1E] rounded-lg p-2 border border-[#333]">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateTemplate()}
                  placeholder="Template name..."
                  autoFocus
                  className="w-full bg-transparent text-xs text-slate-300 placeholder:text-slate-600 outline-none mb-2"
                />
                <div className="flex gap-1.5 justify-end">
                  <button
                    onClick={() => { setIsCreating(false); setNewName(""); }}
                    className="px-2 py-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateTemplate}
                    className="px-2 py-1 text-[10px] bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-0.5">
              {filteredLocal.map((t) => (
                <div
                  key={t.id}
                  className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/4 transition-colors"
                >
                  <FileText className="w-3 h-3 text-slate-600 group-hover:text-primary/70 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-slate-300 group-hover:text-white truncate block">{t.name}</span>
                    <span className="text-[10px] text-slate-600 truncate block">{t.description}</span>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-slate-300">
                      <Edit3 className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteLocal(t.id)}
                      className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:text-red-400"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
