import { useState } from "react";
import { X, Settings, FolderArchive, Info, BookTemplate, ChevronRight, Cpu, Github, BookOpen, Plus, Trash2, ExternalLink, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { accentPresets, getAccent, setAccent } from "@/lib/accent";

function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5;
}

type SettingsCategory = "general" | "templates" | "models" | "backup" | "about";

interface SettingsOverlayProps {
  onClose: () => void;
}

const categories: { id: SettingsCategory; label: string; icon: React.ElementType }[] = [
  { id: "general", label: "General", icon: Settings },
  { id: "templates", label: "Templates", icon: BookTemplate },
  { id: "models", label: "Models & LLM", icon: Cpu },
  { id: "backup", label: "Backup & Sync", icon: FolderArchive },
  { id: "about", label: "About", icon: Info },
];

const fontOptions = [
  "Plus Jakarta Sans",
  "Inter",
  "JetBrains Mono",
  "Fira Code",
  "Source Sans 3",
  "DM Sans",
  "System UI",
];

function GeneralSettings() {
  const [font, setFont] = useState("Plus Jakarta Sans");
  const [activeAccent, setActiveAccent] = useState(getAccent);
  const [customColor, setCustomColor] = useState("");

  const pickColor = (hex: string) => {
    setActiveAccent(hex);
    setAccent(hex);
  };

  return (
    <div className="space-y-6">
      {/* Accent Color */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Accent Color</h3>
        <p className="text-xs text-slate-500 mb-3">Choose the primary color for the interface</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {accentPresets.map((p) => (
            <button
              key={p.hex}
              onClick={() => pickColor(p.hex)}
              className={cn(
                "w-9 h-9 rounded-xl border-2 transition-all flex items-center justify-center",
                activeAccent === p.hex
                  ? "border-white scale-110"
                  : "border-transparent hover:border-white/30 hover:scale-105"
              )}
              style={{ backgroundColor: p.hex }}
              title={p.name}
            >
              {activeAccent === p.hex && (
                <Check className="w-3.5 h-3.5" style={{ color: isLight(p.hex) ? "#000" : "#fff" }} />
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-xs">#</span>
            <input
              type="text"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customColor.length === 6) pickColor(`#${customColor}`);
              }}
              placeholder="Custom hex..."
              className="w-full bg-[#1E1E1E] border border-[#333] rounded-lg py-2 pl-7 pr-3 text-xs text-slate-300 placeholder:text-slate-600 outline-none focus:border-primary/40"
            />
          </div>
          <button
            onClick={() => { if (customColor.length === 6) pickColor(`#${customColor}`); }}
            className="px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
      <div className="border-t border-[#333] pt-6">
        <h3 className="text-sm font-semibold text-white mb-1">Font Family</h3>
        <p className="text-xs text-slate-500 mb-3">Choose the display font for the interface</p>
        <select
          value={font}
          onChange={(e) => setFont(e.target.value)}
          className="w-full bg-[#1E1E1E] border border-[#333] rounded-lg py-2 px-3 text-xs text-slate-300 outline-none focus:border-primary/40"
        >
          {fontOptions.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>
      <div className="border-t border-[#333] pt-6">
        <h3 className="text-sm font-semibold text-white mb-1">Voice Input</h3>
        <p className="text-xs text-slate-500 mb-3">Configure speech-to-text settings</p>
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="w-9 h-5 bg-primary rounded-full relative">
            <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 right-0.5" />
          </div>
          <span className="text-xs text-slate-300">Enable voice input</span>
        </label>
      </div>
      <div className="border-t border-[#333] pt-6">
        <h3 className="text-sm font-semibold text-white mb-1">Default Model</h3>
        <p className="text-xs text-slate-500 mb-3">Set the default LLM for new chats</p>
        <select className="w-full bg-[#1E1E1E] border border-[#333] rounded-lg py-2 px-3 text-xs text-slate-300 outline-none focus:border-primary/40">
          <option>Local — llama3.2</option>
          <option>Local — codellama</option>
          <option>Local — mistral</option>
        </select>
      </div>
    </div>
  );
}

function TemplateSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Community Repository</h3>
        <p className="text-xs text-slate-500 mb-3">Git repository for community prompt templates</p>
        <div className="flex gap-2">
          <input
            type="text"
            value="https://github.com/getthatquick/community-templates"
            readOnly
            className="flex-1 bg-[#1E1E1E] border border-[#333] rounded-lg py-2 px-3 text-xs text-slate-400 outline-none"
          />
          <button className="px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
            Sync
          </button>
        </div>
      </div>
      <div className="border-t border-[#333] pt-6">
        <h3 className="text-sm font-semibold text-white mb-1">Local Templates</h3>
        <p className="text-xs text-slate-500 mb-3">Manage your saved templates</p>
        <div className="space-y-2">
          {["Code Review Request", "Bug Report", "Email Draft", "Meeting Summary"].map((t) => (
            <div key={t} className="flex items-center justify-between bg-[#1E1E1E] rounded-lg px-3 py-2.5">
              <span className="text-xs text-slate-300">{t}</span>
              <button className="text-[10px] text-slate-500 hover:text-red-400 transition-colors">Remove</button>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-[#333] pt-6">
        <h3 className="text-sm font-semibold text-white mb-1">Import / Export</h3>
        <p className="text-xs text-slate-500 mb-3">Share templates between instances</p>
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 text-xs font-medium hover:bg-white/8 transition-colors">Import JSON</button>
          <button className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 text-xs font-medium hover:bg-white/8 transition-colors">Export All</button>
        </div>
      </div>
    </div>
  );
}

function ModelSettings() {
  const [providers, setProviders] = useState([
    { id: "ollama", name: "Ollama", url: "http://localhost:11434", type: "local" as const, enabled: true },
    { id: "openrouter", name: "OpenRouter", url: "https://openrouter.ai/api", type: "cloud" as const, enabled: true },
  ]);

  const handleRemoveProvider = (id: string) => {
    setProviders((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-white">Providers</h3>
          <button className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-primary hover:bg-primary/10 transition-colors">
            <Plus className="w-3 h-3" />
            Add Provider
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-3">Manage LLM providers for your sessions</p>
        <div className="space-y-2">
          {providers.map((p) => (
            <div key={p.id} className="bg-[#1E1E1E] rounded-lg px-3 py-3 border border-[#333]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300 font-medium">{p.name}</span>
                  <span className={cn(
                    "text-[9px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wide",
                    p.type === "local" ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                  )}>
                    {p.type}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className={cn(
                      "w-7 h-4 rounded-full relative transition-colors",
                      p.enabled ? "bg-primary" : "bg-white/10"
                    )}>
                      <div className={cn(
                        "w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all",
                        p.enabled ? "right-0.5" : "left-0.5"
                      )} />
                    </div>
                  </label>
                  <button
                    onClick={() => handleRemoveProvider(p.id)}
                    className="w-6 h-6 flex items-center justify-center rounded text-slate-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <input
                type="text"
                defaultValue={p.url}
                className="w-full bg-[#161616] border border-[#2a2a2a] rounded-md py-1.5 px-2.5 text-[11px] text-slate-400 outline-none focus:border-primary/40"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-[#333] pt-6">
        <h3 className="text-sm font-semibold text-white mb-1">Available Models</h3>
        <p className="text-xs text-slate-500 mb-3">Models detected from connected providers</p>
        <div className="space-y-2">
          {[
            { name: "llama3.2", size: "4.7 GB", provider: "Ollama", status: "active" },
            { name: "codellama", size: "3.8 GB", provider: "Ollama", status: "available" },
            { name: "mistral", size: "4.1 GB", provider: "Ollama", status: "available" },
            { name: "gpt-4o-mini", size: "—", provider: "OpenRouter", status: "available" },
          ].map((m) => (
            <div key={m.name} className="flex items-center justify-between bg-[#1E1E1E] rounded-lg px-3 py-2.5">
              <div>
                <span className="text-xs text-slate-300 font-medium">{m.name}</span>
                <span className="text-[10px] text-slate-600 ml-2">{m.size}</span>
                <span className="text-[9px] text-slate-600 ml-2">via {m.provider}</span>
              </div>
              <span className={cn(
                "text-[10px] font-medium px-2 py-0.5 rounded-full",
                m.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-slate-500"
              )}>
                {m.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BackupSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Data Export</h3>
        <p className="text-xs text-slate-500 mb-3">Export all chats, projects, and settings</p>
        <button className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
          Export Everything (JSON)
        </button>
      </div>
      <div className="border-t border-[#333] pt-6">
        <h3 className="text-sm font-semibold text-white mb-1">Import Data</h3>
        <p className="text-xs text-slate-500 mb-3">Restore from a previous export</p>
        <button className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 text-xs font-medium hover:bg-white/8 transition-colors">
          Import from File
        </button>
      </div>
      <div className="border-t border-[#333] pt-6">
        <h3 className="text-sm font-semibold text-white mb-1">Reset</h3>
        <p className="text-xs text-slate-500 mb-3">Clear all data and start fresh</p>
        <button className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors">
          Reset All Data
        </button>
      </div>
    </div>
  );
}

function AboutSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white mb-1">GetThatQuick</h3>
        <p className="text-xs text-slate-500">Self-hosted prompt workbench</p>
      </div>
      <div className="bg-[#1E1E1E] rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Version</span>
          <span className="text-slate-300">0.0.1-alpha</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Runtime</span>
          <span className="text-slate-300">Bun + Vite</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">License</span>
          <span className="text-slate-300">MIT</span>
        </div>
      </div>
      <div className="border-t border-[#333] pt-6">
        <h3 className="text-sm font-semibold text-white mb-3">Links</h3>
        <div className="space-y-2">
          <a
            href="https://github.com/getthatquick/getthatquick"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-[#1E1E1E] rounded-lg px-3 py-2.5 text-xs text-slate-300 hover:bg-white/6 transition-colors group"
          >
            <Github className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            <div className="flex-1">
              <span className="font-medium">GitHub Repository</span>
              <p className="text-[10px] text-slate-600 mt-0.5">Star, fork, or contribute</p>
            </div>
            <ExternalLink className="w-3 h-3 text-slate-600" />
          </a>
          <a
            href="https://github.com/getthatquick/getthatquick/wiki"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-[#1E1E1E] rounded-lg px-3 py-2.5 text-xs text-slate-300 hover:bg-white/6 transition-colors group"
          >
            <BookOpen className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            <div className="flex-1">
              <span className="font-medium">Tutorial & Docs</span>
              <p className="text-[10px] text-slate-600 mt-0.5">Getting started guide and documentation</p>
            </div>
            <ExternalLink className="w-3 h-3 text-slate-600" />
          </a>
        </div>
      </div>
      <div className="border-t border-[#333] pt-6">
        <p className="text-xs text-slate-500 leading-relaxed">
          A local-first, self-hosted prompt toolkit designed for developers. Manage prompts, templates, and chat sessions — all running on your machine.
        </p>
      </div>
    </div>
  );
}

const settingsContent: Record<SettingsCategory, React.ComponentType> = {
  general: GeneralSettings,
  templates: TemplateSettings,
  models: ModelSettings,
  backup: BackupSettings,
  about: AboutSettings,
};

export function SettingsOverlay({ onClose }: SettingsOverlayProps) {
  const [active, setActive] = useState<SettingsCategory>("general");
  const Content = settingsContent[active];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-[720px] max-w-[90vw] h-[520px] max-h-[85vh] bg-[#1E1E1E] rounded-2xl border border-[#333] shadow-2xl flex overflow-hidden">
        {/* Left nav */}
        <nav className="w-48 shrink-0 border-r border-[#333] p-3 flex flex-col gap-0.5">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-3 pt-2 pb-3">
            Settings
          </h2>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActive(cat.id)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left",
                active === cat.id
                  ? "bg-white/8 text-white"
                  : "text-slate-400 hover:bg-white/4 hover:text-slate-200"
              )}
            >
              <cat.icon className="w-3.5 h-3.5 shrink-0" />
              {cat.label}
              {active === cat.id && <ChevronRight className="w-3 h-3 ml-auto text-slate-600" />}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#333]">
            <h2 className="text-sm font-semibold text-white capitalize">{active}</h2>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/8 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <Content />
          </div>
        </div>
      </div>
    </div>
  );
}
