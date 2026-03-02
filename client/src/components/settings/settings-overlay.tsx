/**
 * @fileoverview Settings overlay — modal panel for app configuration.
 *
 * Categories: General (accent, font, default model), Templates,
 * Models & LLM (providers with real API configs), Backup, About.
 * Receives server-backed settings via props from the Dashboard.
 *
 * @module components/settings/settings-overlay
 * @license CC BY-NC 4.0 — {@link https://creativecommons.org/licenses/by-nc/4.0/}
 * @author Gurkirat Singh
 * @created 2026-02-28
 * @updated 2026-03-03
 */

import { useState, useEffect, useCallback } from "react";
import { X, SlidersHorizontal, HardDrive, Info, LayoutTemplate, ChevronRight, BrainCircuit, Github, BookOpen, Plus, Trash2, ExternalLink, Check, Globe, FileCode2, Download, Upload, AlertTriangle, Mic, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { accentPresets, getAccent, setAccent } from "@/lib/accent";
import type { Settings as SettingsType, AIProviderConfig, VoskModelInfo } from "@shared/types";
import * as api from "@/api/client";

/** Check if a hex color is perceptually light. */
function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5;
}

type SettingsCategory = "general" | "templates" | "models" | "voice" | "backup" | "about";

/** Props accepted by {@link SettingsOverlay}. */
interface SettingsOverlayProps {
  /** Close the overlay. */
  onClose: () => void;
  /** Current server settings (null while loading). */
  settings: SettingsType | null;
  /** Persist partial settings updates. */
  onUpdateSettings: (updates: Partial<SettingsType>) => Promise<void>;
  /** Test a provider connection. Returns true on success. */
  onTestProvider: (config: { apiKey: string; model: string; baseUrl: string }) => Promise<boolean>;
  /** Whether settings are still loading. */
  settingsLoading: boolean;
}

const categories: { id: SettingsCategory; label: string; icon: React.ElementType }[] = [
  { id: "general", label: "General", icon: SlidersHorizontal },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "models", label: "Models & LLM", icon: BrainCircuit },
  { id: "voice", label: "Voice / STT", icon: Mic },
  { id: "backup", label: "Backup & Sync", icon: HardDrive },
  { id: "about", label: "About", icon: Info },
];

const FONT_KEY = "gtq_font";

function getFont(): string {
  return localStorage.getItem(FONT_KEY) || "Inter";
}

function setFontPersist(font: string) {
  localStorage.setItem(FONT_KEY, font);
  applyFont(font);
}

function applyFont(font: string) {
  const root = document.documentElement;
  const family = font === "System UI" ? "system-ui, -apple-system, sans-serif" : `"${font}", system-ui, sans-serif`;
  root.style.setProperty("--font-display", family);
  document.body.style.fontFamily = family;
}

const fontOptions = [
  "GTQ Custom",
  "Inter",
  "Plus Jakarta Sans",
  "JetBrains Mono",
  "Fira Code",
  "Source Sans 3",
  "DM Sans",
  "System UI",
];

/** Well-known provider presets with base URLs and docs. */
const providerPresets: { name: string; baseUrl: string; hint: string }[] = [
  { name: "openrouter", baseUrl: "https://openrouter.ai/api/v1", hint: "Unified access to 200+ models. Get key at openrouter.ai/keys" },
  { name: "openai", baseUrl: "https://api.openai.com/v1", hint: "GPT-4o, GPT-4, GPT-3.5. Get key at platform.openai.com/api-keys" },
  { name: "ollama", baseUrl: "http://localhost:11434/v1", hint: "Local models. No API key needed. Install at ollama.com" },
];

function GeneralSettings({ settings, onUpdateSettings }: { settings?: SettingsType | null; onUpdateSettings?: (u: Partial<SettingsType>) => Promise<void> }) {
  const [font, setFont] = useState(getFont);
  const [activeAccent, setActiveAccent] = useState(getAccent);
  const [customColor, setCustomColor] = useState("");

  // Apply font on mount
  useEffect(() => {
    applyFont(font);
  }, []);

  const pickColor = (hex: string) => {
    setActiveAccent(hex);
    setAccent(hex);
  };

  const handleFontChange = (newFont: string) => {
    setFont(newFont);
    setFontPersist(newFont);
  };

  const providers = settings?.ai?.providers ?? {};
  const activeProvider = settings?.ai?.provider ?? "";
  const activeConfig = providers[activeProvider];

  return (
    <div className="space-y-6">
      {/* Accent Color */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Accent Color</h3>
        <p className="text-xs text-zinc-500 mb-3">Choose the primary color for the interface</p>
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
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">#</span>
            <input
              type="text"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customColor.length === 6) pickColor(`#${customColor}`);
              }}
              placeholder="Custom hex..."
              className="w-full bg-background-dark border border-shell-border rounded-lg py-2 pl-7 pr-3 text-xs text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-primary/40"
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

      {/* Font Family */}
      <div className="border-t border-shell-border pt-6">
        <h3 className="text-sm font-semibold text-white mb-1">Font Family</h3>
        <p className="text-xs text-zinc-500 mb-3">Choose the display font. Drop custom fonts in <code className="text-primary/80 bg-primary/5 px-1 rounded text-[10px]">public/fonts/</code></p>
        <select
          value={font}
          onChange={(e) => handleFontChange(e.target.value)}
          className="w-full bg-background-dark border border-shell-border rounded-lg py-2 px-3 text-xs text-zinc-300 outline-none focus:border-primary/40 cursor-pointer"
        >
          {fontOptions.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <p className="text-[10px] text-zinc-600 mt-1.5" style={{ fontFamily: font === "System UI" ? "system-ui" : `"${font}", system-ui` }}>
          Preview: The quick brown fox jumps over the lazy dog
        </p>
      </div>

      {/* Default Model */}
      <div className="border-t border-shell-border pt-6">
        <h3 className="text-sm font-semibold text-white mb-1">Default Model</h3>
        <p className="text-xs text-zinc-500 mb-3">Set the default LLM for new chats</p>
        {Object.keys(providers).length === 0 ? (
          <p className="text-xs text-zinc-600 bg-background-dark rounded-lg px-3 py-2.5 border border-shell-border">
            No providers configured. Add one in <span className="text-primary">Models & LLM</span> first.
          </p>
        ) : (
          <div className="space-y-2">
            <select
              value={activeProvider}
              onChange={async (e) => {
                if (onUpdateSettings && settings) {
                  await onUpdateSettings({ ai: { ...settings.ai, provider: e.target.value } });
                }
              }}
              className="w-full bg-background-dark border border-shell-border rounded-lg py-2 px-3 text-xs text-zinc-300 outline-none focus:border-primary/40 cursor-pointer"
            >
              {Object.keys(providers).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            {activeConfig && (
              <ModelSelect
                providerName={activeProvider}
                value={activeConfig.model}
                onChange={async (v) => {
                  if (onUpdateSettings && settings) {
                    const updated = { ...providers, [activeProvider]: { ...activeConfig, model: v } };
                    await onUpdateSettings({ ai: { ...settings.ai, providers: updated } });
                  }
                }}
                className="w-full bg-background-dark border border-shell-border rounded-lg py-2 px-3 text-xs text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-primary/40"
                placeholder="Model name (e.g. gpt-4o, claude-3.5-sonnet)"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateSettings() {
  const [repoUrl, setRepoUrl] = useState("https://github.com/getthatquick/community-templates");

  return (
    <div className="space-y-6">
      {/* Community Repository */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-sm font-semibold text-white">Community Repository</h3>
        </div>
        <p className="text-xs text-zinc-500 mb-3">Git repository for community prompt templates</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            className="flex-1 bg-background-dark border border-shell-border rounded-lg py-2 px-3 text-xs text-zinc-300 outline-none focus:border-primary/40"
            placeholder="https://github.com/org/templates"
          />
          <button className="px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
            Sync
          </button>
        </div>
      </div>

      {/* Local Templates */}
      <div className="border-t border-shell-border pt-6">
        <div className="flex items-center gap-2 mb-1">
          <FileCode2 className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-sm font-semibold text-white">Local Templates</h3>
        </div>
        <p className="text-xs text-zinc-500 mb-3">Manage your custom templates. Create and edit from the Templates sidebar.</p>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 text-zinc-300 text-xs font-medium hover:bg-white/8 transition-colors">
            <Upload className="w-3 h-3" />
            Import JSON
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 text-zinc-300 text-xs font-medium hover:bg-white/8 transition-colors">
            <Download className="w-3 h-3" />
            Export All
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Dropdown that fetches available models from a provider's API.
 * Falls back to a text input if the fetch fails or returns empty.
 */
function ModelSelect({
  providerName,
  value,
  onChange,
  className,
  placeholder = "Model",
}: {
  providerName: string;
  value: string;
  onChange: (model: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const fetchModels = useCallback(async () => {
    if (!providerName) return;
    setLoading(true);
    setFailed(false);
    try {
      const list = await api.listProviderModels(providerName);
      setModels(list);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [providerName]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const base = className ?? "w-full bg-[#161618] border border-[#1A1A1E] rounded-md py-1.5 px-2.5 text-[11px] text-zinc-400 outline-none focus:border-primary/40";

  if (loading) {
    return (
      <div className={cn(base, "flex items-center gap-1.5 text-zinc-600")}>
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading models…
      </div>
    );
  }

  if (failed || models.length === 0) {
    return (
      <input
        type="text"
        defaultValue={value}
        onBlur={(e) => onChange(e.target.value)}
        className={base}
        placeholder={placeholder}
      />
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(base, "cursor-pointer")}
    >
      {!value && <option value="">Select a model…</option>}
      {models.map((m) => (
        <option key={m.id} value={m.id}>{m.name || m.id}</option>
      ))}
    </select>
  );
}

/** Props for model settings sub-component. */
interface ModelSettingsProps {
  settings: SettingsType | null;
  onUpdateSettings: (updates: Partial<SettingsType>) => Promise<void>;
  onTestProvider: (config: { apiKey: string; model: string; baseUrl: string }) => Promise<boolean>;
}

function ModelSettings({ settings, onUpdateSettings, onTestProvider }: ModelSettingsProps) {
  const [showPresets, setShowPresets] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({});
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const providers = settings?.ai?.providers ?? {};
  const activeProvider = settings?.ai?.provider ?? "";

  /** Remove a provider from settings. */
  const handleRemoveProvider = async (name: string) => {
    const updated = { ...providers };
    delete updated[name];
    const newActive = activeProvider === name ? Object.keys(updated)[0] || "" : activeProvider;
    await onUpdateSettings({ ai: { ...settings!.ai, provider: newActive, providers: updated } });
  };

  /** Add a provider (from preset or manual). */
  const handleAddProvider = async (name: string, baseUrl: string) => {
    if (!name.trim() || !baseUrl.trim()) return;
    const updated = {
      ...providers,
      [name.trim()]: { apiKey: "", model: "", baseUrl: baseUrl.trim() },
    };
    const active = activeProvider || name.trim();
    await onUpdateSettings({ ai: { ...settings!.ai, provider: active, providers: updated } });
    setNewName("");
    setNewUrl("");
    setShowPresets(false);
  };

  /** Test a provider's connection. */
  const handleTest = async (name: string, config: AIProviderConfig) => {
    setTesting(name);
    setTestResults((prev) => ({ ...prev, [name]: null }));
    const ok = await onTestProvider(config);
    setTestResults((prev) => ({ ...prev, [name]: ok }));
    setTesting(null);
  };

  /** Update a single field on a provider entry. */
  const handleUpdateProviderField = async (
    name: string,
    field: keyof AIProviderConfig,
    value: string
  ) => {
    const updated = {
      ...providers,
      [name]: { ...providers[name], [field]: value },
    };
    await onUpdateSettings({ ai: { ...settings!.ai, providers: updated } });
  };

  /** Set the active provider. */
  const handleSetActive = async (name: string) => {
    await onUpdateSettings({ ai: { ...settings!.ai, provider: name } });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-white">Providers</h3>
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-primary hover:bg-primary/10 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Provider
          </button>
        </div>
        <p className="text-xs text-zinc-500 mb-3">Configure LLM providers. Each uses an OpenAI-compatible API.</p>

        {/* Provider presets dropdown */}
        {showPresets && (
          <div className="mb-4 bg-background-dark rounded-lg border border-shell-border p-3 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1 mb-2">Quick Add</p>
            {providerPresets.filter((p) => !providers[p.name]).map((preset) => (
              <button
                key={preset.name}
                onClick={() => handleAddProvider(preset.name, preset.baseUrl)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-white/4 transition-colors group"
              >
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BrainCircuit className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-zinc-300 font-medium block">{preset.name}</span>
                  <span className="text-[10px] text-zinc-600 block truncate">{preset.hint}</span>
                </div>
                <Plus className="w-3 h-3 text-zinc-600 group-hover:text-primary transition-colors shrink-0" />
              </button>
            ))}
            <div className="mt-2 pt-2 border-t border-shell-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-1 mb-2">Custom</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Provider name"
                  className="flex-1 bg-[#161618] border border-shell-border rounded-lg py-1.5 px-2.5 text-[11px] text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-primary/40"
                />
                <input
                  type="text"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="Base URL"
                  className="flex-1 bg-[#161618] border border-shell-border rounded-lg py-1.5 px-2.5 text-[11px] text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-primary/40"
                />
                <button
                  onClick={() => handleAddProvider(newName, newUrl)}
                  className="px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Existing providers */}
        <div className="space-y-2">
          {Object.entries(providers).map(([name, config]) => {
            const isExpanded = expandedCard === name;
            return (
              <div key={name} className="bg-background-dark rounded-lg border border-shell-border">
                {/* Collapsed header — always visible */}
                <div
                  className="flex items-center justify-between px-3 py-2.5 cursor-pointer"
                  onClick={() => setExpandedCard(isExpanded ? null : name)}
                >
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-xs text-zinc-300 font-medium">{name}</span>
                    {activeProvider === name && (
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wide bg-emerald-500/10 text-emerald-400">
                        active
                      </span>
                    )}
                    {config.model && (
                      <span className="text-[10px] text-zinc-600">{config.model}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {activeProvider !== name && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSetActive(name); }}
                        className="text-[10px] text-primary hover:underline mr-1"
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTest(name, config); }}
                      disabled={testing !== null}
                      className={cn(
                        "text-[10px] transition-colors mr-1",
                        testResults[name] === true ? "text-emerald-400" :
                        testResults[name] === false ? "text-red-400" :
                        "text-zinc-500 hover:text-primary"
                      )}
                    >
                      {testing === name ? "Testing..." : testResults[name] === true ? "Connected" : testResults[name] === false ? "Failed" : "Test"}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveProvider(name); }}
                      className="w-6 h-6 flex items-center justify-center rounded text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <ChevronRight className={cn(
                      "w-3 h-3 text-zinc-600 transition-transform",
                      isExpanded && "rotate-90"
                    )} />
                  </div>
                </div>

                {/* Expanded form fields */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-shell-border">
                    <input
                      type="text"
                      defaultValue={config.baseUrl}
                      onBlur={(e) => handleUpdateProviderField(name, "baseUrl", e.target.value)}
                      className="w-full bg-[#161618] border border-[#1A1A1E] rounded-md py-1.5 px-2.5 text-[11px] text-zinc-400 outline-none focus:border-primary/40 mb-1.5"
                      placeholder="Base URL"
                    />
                    <div className="flex gap-1.5">
                      <input
                        type="password"
                        defaultValue={config.apiKey}
                        onBlur={(e) => handleUpdateProviderField(name, "apiKey", e.target.value)}
                        className="flex-1 bg-[#161618] border border-[#1A1A1E] rounded-md py-1.5 px-2.5 text-[11px] text-zinc-400 outline-none focus:border-primary/40"
                        placeholder="API Key (optional for local)"
                      />
                      <div className="flex-1">
                        <ModelSelect
                          providerName={name}
                          value={config.model}
                          onChange={(v) => handleUpdateProviderField(name, "model", v)}
                          placeholder="Model (e.g. gpt-4o)"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {Object.keys(providers).length === 0 && !showPresets && (
          <div className="bg-background-dark rounded-lg p-6 border border-shell-border text-center">
            <BrainCircuit className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-xs text-zinc-500 mb-2">No providers configured yet</p>
            <button
              onClick={() => setShowPresets(true)}
              className="text-[11px] text-primary hover:underline"
            >
              Add your first provider
            </button>
          </div>
        )}
      </div>

      {/* Generation Settings */}
      <div className="border-t border-shell-border pt-6">
        <h3 className="text-sm font-semibold text-white mb-1">Generation Settings</h3>
        <p className="text-xs text-zinc-500 mb-3">System prompt, temperature, and token settings</p>

        {/* System Prompt */}
        <div className="mb-4">
          <label className="text-xs text-zinc-400 mb-1.5 block">System Prompt</label>
          <textarea
            rows={4}
            value={settings?.ai?.systemPrompt ?? ""}
            onChange={(e) => {
              if (onUpdateSettings && settings) {
                onUpdateSettings({ ai: { ...settings.ai, systemPrompt: e.target.value } });
              }
            }}
            className="w-full bg-background-dark border border-shell-border rounded-lg py-2 px-3 text-[11px] text-zinc-300 outline-none focus:border-primary/40 resize-y leading-relaxed"
            placeholder="You are a helpful assistant..."
          />
          <p className="text-[10px] text-zinc-600 mt-1">Templates override this per-session.</p>
        </div>

        {/* Temperature */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-zinc-400">Temperature</label>
            <span className="text-xs text-primary font-mono">{(settings?.ai?.temperature ?? 0.7).toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={settings?.ai?.temperature ?? 0.7}
            onChange={(e) => {
              if (onUpdateSettings && settings) {
                onUpdateSettings({ ai: { ...settings.ai, temperature: parseFloat(e.target.value) } });
              }
            }}
            className="w-full h-1 bg-shell-border rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between mt-0.5">
            <span className="text-[9px] text-zinc-700">Precise</span>
            <span className="text-[9px] text-zinc-700">Creative</span>
          </div>
        </div>

        {/* Max Output Tokens */}
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Max Output Tokens</label>
          <input
            type="number"
            min="0"
            step="256"
            value={settings?.ai?.maxTokens ?? 0}
            onChange={(e) => {
              if (onUpdateSettings && settings) {
                onUpdateSettings({ ai: { ...settings.ai, maxTokens: parseInt(e.target.value) || 0 } });
              }
            }}
            className="w-full bg-background-dark border border-shell-border rounded-lg py-2 px-3 text-xs text-zinc-300 outline-none focus:border-primary/40"
            placeholder="0 = model default"
          />
        </div>
      </div>

      <div className="border-t border-shell-border pt-6">
        <h3 className="text-sm font-semibold text-white mb-1">Active Provider</h3>
        {activeProvider ? (
          <div className="bg-background-dark rounded-lg px-3 py-2.5 border border-shell-border">
            <p className="text-xs text-zinc-400">
              Provider: <span className="text-primary font-medium">{activeProvider}</span>
            </p>
            {providers[activeProvider]?.model && (
              <p className="text-xs text-zinc-400 mt-0.5">
                Model: <span className="text-zinc-300 font-medium">{providers[activeProvider].model}</span>
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-zinc-600 bg-background-dark rounded-lg px-3 py-2.5 border border-shell-border">
            No active provider. Add and configure one above.
          </p>
        )}
      </div>
    </div>
  );
}

function BackupSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Data Export</h3>
        <p className="text-xs text-zinc-500 mb-3">Export all chats, templates, and settings as JSON</p>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
          <Download className="w-3 h-3" />
          Export Everything (JSON)
        </button>
      </div>
      <div className="border-t border-shell-border pt-6">
        <h3 className="text-sm font-semibold text-white mb-1">Import Data</h3>
        <p className="text-xs text-zinc-500 mb-3">Restore from a previous export</p>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/5 text-zinc-300 text-xs font-medium hover:bg-white/8 transition-colors">
          <Upload className="w-3 h-3" />
          Import from File
        </button>
      </div>
      <div className="border-t border-shell-border pt-6">
        <h3 className="text-sm font-semibold text-white mb-1">Reset</h3>
        <p className="text-xs text-zinc-500 mb-3">Clear all data and start fresh</p>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors">
          <AlertTriangle className="w-3 h-3" />
          Reset All Data
        </button>
      </div>
    </div>
  );
}

/** Voice / STT settings — download, activate, delete Vosk models. */
function VoiceSettings({ settings, onUpdateSettings }: { settings?: SettingsType | null; onUpdateSettings?: (u: Partial<SettingsType>) => Promise<void> }) {
  const [models, setModels] = useState<VoskModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<Record<string, { 
    percent: number; 
    status: string;
    speed?: number;
    eta?: number;
  }>>({});
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const refreshModels = () => {
    api.listModels()
      .then(setModels)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { refreshModels(); }, []);

  const handleDownload = async (id: string) => {
    setDownloading((prev) => new Set(prev).add(id));
    setDownloadProgress((prev) => ({ ...prev, [id]: { percent: 0, status: "downloading" } }));
    setError(null);
    try {
      await api.downloadModel(id, (info) => {
        setDownloadProgress((prev) => ({ 
          ...prev, 
          [id]: { 
            percent: info.percent,
            status: info.status,
            speed: info.speed,
            eta: info.eta,
          } 
        }));
      });
      refreshModels();
    } catch (err: any) {
      let errorMsg = "Download failed";
      
      if (err instanceof api.ApiClientError) {
        if (err.isNetworkError) {
          errorMsg = "Network error: Please check your internet connection";
        } else {
          errorMsg = err.message;
        }
      } else {
        errorMsg = err.message || errorMsg;
      }
      
      setError(errorMsg);
    } finally {
      setDownloading((prev) => { const next = new Set(prev); next.delete(id); return next; });
      setDownloadProgress((prev) => { const next = { ...prev }; delete next[id]; return next; });
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const cancelled = await api.cancelDownload(id);
      if (cancelled) {
        setDownloading((prev) => { const next = new Set(prev); next.delete(id); return next; });
        setDownloadProgress((prev) => { const next = { ...prev }; delete next[id]; return next; });
        refreshModels();
      }
    } catch (err: any) {
      let errorMsg = "Cancel failed";
      
      if (err instanceof api.ApiClientError && err.isNetworkError) {
        errorMsg = "Network error: Could not cancel download";
      } else {
        errorMsg = err.message || errorMsg;
      }
      
      setError(errorMsg);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await api.activateModel(id);
      if (onUpdateSettings) {
        await onUpdateSettings({ stt: { activeModel: id, sampleRate: settings?.stt?.sampleRate ?? 16000 } });
      }
      refreshModels();
    } catch (err: any) {
      setError(err.message || "Activation failed");
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    setError(null);
    try {
      await api.deleteModel(id);
      refreshModels();
    } catch (err: any) {
      setError(err.message || "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
        <span className="ml-2 text-xs text-zinc-500">Loading models...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Vosk Speech Models</h3>
        <p className="text-xs text-zinc-500 mb-4">Download and manage offline speech-to-text models. Models run locally — no data leaves your machine.</p>

        {error && (
          <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg mb-3">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <p className="text-[11px] text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          {models.map((model) => (
            <div key={model.id} className="bg-background-dark rounded-lg px-3 py-3 border border-shell-border">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Mic className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-xs text-zinc-300 font-medium">{model.name}</span>
                  {model.active && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wide bg-emerald-500/10 text-emerald-400">
                      active
                    </span>
                  )}
                  {model.default && !model.active && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wide bg-primary/10 text-primary">
                      recommended
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-zinc-600">{model.size}</span>
              </div>

              <div className="flex items-center gap-3 text-[10px] text-zinc-500 mb-2">
                <span>Accuracy: {model.accuracy}</span>
                <span>Min RAM: {model.minRAM}</span>
                <span>Language: {model.language}</span>
              </div>

              {/* Actions row */}
              <div className="flex items-center gap-2">
                {model.downloaded ? (
                  <>
                    {!model.active && (
                      <button
                        onClick={() => handleActivate(model.id)}
                        className="text-[10px] text-primary hover:underline"
                      >
                        Activate
                      </button>
                    )}
                    {model.active && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(model.id)}
                      disabled={deleting === model.id}
                      className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors ml-auto"
                    >
                      {deleting === model.id ? "Deleting..." : "Delete"}
                    </button>
                  </>
                ) : downloading.has(model.id) ? (
                  <div className="flex flex-col gap-1.5 w-full">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-shell-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${downloadProgress[model.id]?.percent ?? 0}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-primary shrink-0">
                        {downloadProgress[model.id]?.percent ?? 0}%
                      </span>
                      <button
                        onClick={() => handleCancel(model.id)}
                        className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors"
                        title="Cancel download"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-zinc-500">
                      {downloadProgress[model.id]?.status === "extracting" ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Extracting...
                        </span>
                      ) : downloadProgress[model.id]?.speed ? (
                        <>
                          <span>
                            {(downloadProgress[model.id].speed! / 1024 / 1024).toFixed(1)} MB/s
                          </span>
                          {downloadProgress[model.id].eta !== undefined && downloadProgress[model.id].eta! > 0 && (
                            <span>
                              • ETA: {downloadProgress[model.id].eta! < 60 
                                ? `${downloadProgress[model.id].eta}s` 
                                : `${Math.floor(downloadProgress[model.id].eta! / 60)}m ${downloadProgress[model.id].eta! % 60}s`}
                            </span>
                          )}
                        </>
                      ) : (
                        <span>Starting download...</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleDownload(model.id)}
                    className="flex items-center gap-1.5 text-[10px] text-primary hover:underline"
                  >
                    <Download className="w-3 h-3" /> Download
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {models.length === 0 && (
          <div className="bg-background-dark rounded-lg p-6 border border-shell-border text-center">
            <Mic className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-xs text-zinc-500">No voice models available</p>
          </div>
        )}
      </div>

      <div className="border-t border-shell-border pt-6">
        <h3 className="text-sm font-semibold text-white mb-1">Active Model</h3>
        {settings?.stt?.activeModel ? (
          <div className="bg-background-dark rounded-lg px-3 py-2.5 border border-shell-border">
            <p className="text-xs text-zinc-400">
              Model: <span className="text-primary font-medium">{settings.stt.activeModel}</span>
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Sample Rate: <span className="text-zinc-300 font-medium">{settings.stt.sampleRate} Hz</span>
            </p>
          </div>
        ) : (
          <p className="text-xs text-zinc-600 bg-background-dark rounded-lg px-3 py-2.5 border border-shell-border">
            No active voice model. Download and activate one above.
          </p>
        )}
      </div>
    </div>
  );
}

function AboutSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white mb-1">GetThatQuick</h3>
        <p className="text-xs text-zinc-500">Self-hosted prompt workbench</p>
      </div>
      <div className="bg-background-dark rounded-lg p-4 space-y-2 border border-shell-border">
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Version</span>
          <span className="text-zinc-300">0.0.1-alpha</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Runtime</span>
          <span className="text-zinc-300">Bun + Vite</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">License</span>
          <span className="text-zinc-300">MIT</span>
        </div>
      </div>
      <div className="border-t border-shell-border pt-6">
        <h3 className="text-sm font-semibold text-white mb-3">Links</h3>
        <div className="space-y-2">
          <a
            href="https://github.com/getthatquick/getthatquick"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-background-dark rounded-lg px-3 py-2.5 text-xs text-zinc-300 hover:bg-white/4 transition-colors group border border-shell-border"
          >
            <Github className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
            <div className="flex-1">
              <span className="font-medium">GitHub Repository</span>
              <p className="text-[10px] text-zinc-600 mt-0.5">Star, fork, or contribute</p>
            </div>
            <ExternalLink className="w-3 h-3 text-zinc-600" />
          </a>
          <a
            href="https://github.com/getthatquick/getthatquick/wiki"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-background-dark rounded-lg px-3 py-2.5 text-xs text-zinc-300 hover:bg-white/4 transition-colors group border border-shell-border"
          >
            <BookOpen className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
            <div className="flex-1">
              <span className="font-medium">Tutorial & Docs</span>
              <p className="text-[10px] text-zinc-600 mt-0.5">Getting started guide and documentation</p>
            </div>
            <ExternalLink className="w-3 h-3 text-zinc-600" />
          </a>
        </div>
      </div>
      <div className="border-t border-shell-border pt-6">
        <p className="text-xs text-zinc-500 leading-relaxed">
          A local-first, self-hosted prompt toolkit designed for developers. Manage prompts, templates, and chat sessions — all running on your machine.
        </p>
      </div>
    </div>
  );
}

const settingsContent: Record<SettingsCategory, React.ComponentType<{ settings?: SettingsType | null; onUpdateSettings?: (u: Partial<SettingsType>) => Promise<void>; onTestProvider?: (c: { apiKey: string; model: string; baseUrl: string }) => Promise<boolean> }>> = {
  general: GeneralSettings,
  templates: TemplateSettings,
  models: ModelSettings as React.ComponentType<{ settings?: SettingsType | null; onUpdateSettings?: (u: Partial<SettingsType>) => Promise<void>; onTestProvider?: (c: { apiKey: string; model: string; baseUrl: string }) => Promise<boolean> }>,
  voice: VoiceSettings,
  backup: BackupSettings,
  about: AboutSettings,
};

/**
 * Full-screen settings overlay with category navigation.
 *
 * @param props - {@link SettingsOverlayProps}
 */
export function SettingsOverlay({ onClose, settings, onUpdateSettings, onTestProvider, settingsLoading }: SettingsOverlayProps) {
  const [active, setActive] = useState<SettingsCategory>("general");
  const Content = settingsContent[active];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-180 max-w-[90vw] h-130 max-h-[85vh] bg-[#0E0E10] rounded-2xl border border-shell-border shadow-2xl flex overflow-hidden">
        {/* Left nav */}
        <nav className="w-48 shrink-0 border-r border-shell-border p-3 flex flex-col gap-0.5">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-3 pt-2 pb-3">
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
                  : "text-zinc-400 hover:bg-white/4 hover:text-zinc-200"
              )}
            >
              <cat.icon className="w-3.5 h-3.5 shrink-0" />
              {cat.label}
              {active === cat.id && <ChevronRight className="w-3 h-3 ml-auto text-zinc-600" />}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-6 py-4 border-b border-shell-border">
            <h2 className="text-sm font-semibold text-white capitalize">{active}</h2>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {settingsLoading ? (
              <div className="flex items-center justify-center h-full text-xs text-zinc-500">Loading settings...</div>
            ) : (
              <Content
                settings={settings}
                onUpdateSettings={onUpdateSettings}
                onTestProvider={onTestProvider}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
