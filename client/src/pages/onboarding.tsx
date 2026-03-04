/**
 * @fileoverview Onboarding wizard — first-run setup flow.
 *
 * A 5-step wizard (Welcome → Voice Model → LLM Provider → API Keys → Done)
 * that guides users through initial configuration. All selections are
 * persisted to the server via the settings and models API.
 *
 * @module pages/onboarding
 * @license CC BY-NC 4.0 — {@link https://creativecommons.org/licenses/by-nc/4.0/}
 * @author Gurkirat Singh
 * @created 2026-02-25
 * @updated 2026-03-03
 */

import { useState, useEffect, useCallback } from "react";
import {
  Zap,
  Mic,
  Key,
  Server,
  ChevronRight,
  ChevronLeft,
  Check,
  Download,
  Globe,
  Shield,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as api from "@/api/client";
import { GtqIcon } from "@/components/brand/gtq-icon";
import type { VoskModelInfo, AIProviderConfig } from "@shared/types";

type Step = "welcome" | "vosk" | "llm" | "keys" | "done";

const steps: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: "welcome", label: "Welcome", icon: Zap },
  { id: "vosk", label: "Voice Model", icon: Mic },
  { id: "llm", label: "LLM Provider", icon: Server },
  { id: "keys", label: "API Keys", icon: Key },
  { id: "done", label: "Ready", icon: Check },
];

interface OnboardingProps {
  onComplete: () => void;
}

/** Shared onboarding state passed to step components. */
interface OnboardingState {
  /** Which LLM provider the user picked. */
  selectedProvider: string;
  /** Provider configs accumulated during onboarding. */
  providerConfigs: Record<string, AIProviderConfig>;
  /** Selected Vosk model ID. */
  selectedVoskModel: string;
  /** Whether a Vosk model was downloaded during this flow. */
  voskDownloaded: boolean;
}

function WelcomeStep() {
  return (
    <div className="flex flex-col items-center text-center max-w-md mx-auto">
      <div className="w-20 h-20 flex items-center justify-center mb-6">
        <GtqIcon size={72} variant="light" />
      </div>
      <h1 className="text-2xl font-bold text-white mb-3">Welcome to GetThatQuick</h1>
      <p className="text-sm text-slate-400 leading-relaxed mb-8">
        Your self-hosted prompt workbench. Let's get you set up in a few quick steps —
        voice model, LLM provider, and optional API keys.
      </p>
      <div className="grid grid-cols-3 gap-4 w-full">
        <div className="bg-[#252525] rounded-xl p-4 border border-[#333]">
          <Mic className="w-5 h-5 text-primary mb-2" />
          <h3 className="text-xs font-semibold text-white mb-1">Voice Input</h3>
          <p className="text-[10px] text-slate-500">Speak your prompts naturally</p>
        </div>
        <div className="bg-[#252525] rounded-xl p-4 border border-[#333]">
          <Shield className="w-5 h-5 text-primary mb-2" />
          <h3 className="text-xs font-semibold text-white mb-1">Local First</h3>
          <p className="text-[10px] text-slate-500">Everything runs on your machine</p>
        </div>
        <div className="bg-[#252525] rounded-xl p-4 border border-[#333]">
          <Globe className="w-5 h-5 text-primary mb-2" />
          <h3 className="text-xs font-semibold text-white mb-1">Templates</h3>
          <p className="text-[10px] text-slate-500">Community & custom prompts</p>
        </div>
      </div>
    </div>
  );
}

interface VoskStepProps {
  selectedModel: string;
  onSelectModel: (id: string) => void;
  onModelDownloaded: () => void;
}

function VoskStep({ selectedModel, onSelectModel, onModelDownloaded }: VoskStepProps) {
  const [models, setModels] = useState<VoskModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState<number | undefined>();
  const [downloadEta, setDownloadEta] = useState<number | undefined>();
  const [downloadStatus, setDownloadStatus] = useState<string>("downloading");
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    api.listModels()
      .then((m) => {
        setModels(m);
        // Auto-select the default model if none selected
        if (!selectedModel) {
          const def = m.find((x) => x.default);
          if (def) onSelectModel(def.id);
        }
      })
      .catch((err) => console.error("[VoskStep] Failed to load models:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (id: string) => {
    setDownloading(id);
    setDownloadProgress(0);
    setDownloadSpeed(undefined);
    setDownloadEta(undefined);
    setDownloadStatus("downloading");
    setDownloadError(null);
    try {
      await api.downloadModel(id, (info) => {
        setDownloadProgress(info.percent);
        setDownloadSpeed(info.speed);
        setDownloadEta(info.eta);
        setDownloadStatus(info.status);
      });
      // Refresh model list to show downloaded status
      const updated = await api.listModels();
      setModels(updated);
      // Activate the model
      await api.activateModel(id);
      onSelectModel(id);
      onModelDownloaded();
    } catch (err: any) {
      setDownloadError(err.message || "Download failed");
    } finally {
      setDownloading(null);
    }
  };

  const formatSpeed = (bytesPerSec?: number) => {
    if (!bytesPerSec) return "";
    const mb = bytesPerSec / 1024 / 1024;
    return mb >= 1 ? `${mb.toFixed(1)} MB/s` : `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
  };

  const formatEta = (seconds?: number) => {
    if (!seconds || seconds <= 0) return "";
    if (seconds < 60) return `${Math.ceil(seconds)}s left`;
    return `${Math.floor(seconds / 60)}m ${Math.ceil(seconds % 60)}s left`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <span className="ml-2 text-sm text-slate-400">Loading models...</span>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto w-full">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-white mb-2">Voice Model (Vosk)</h2>
        <p className="text-sm text-slate-400">
          Select a speech-to-text model for voice input. You can change this later in settings.
        </p>
      </div>

      {/* Scrollable model list with a fixed max-height so the step never overflows */}
      <ScrollArea className="max-h-[50vh] pr-2">
        <div className="space-y-2 mb-2">
          {models.map((model) => (
          <button
            key={model.id}
            onClick={() => onSelectModel(model.id)}
            className={cn(
              "w-full flex items-start gap-3 p-4 rounded-xl border transition-colors text-left",
              selectedModel === model.id
                ? "bg-primary/5 border-primary/30"
                : "bg-[#252525] border-[#333] hover:border-[#444]"
            )}
          >
            <div className={cn(
              "w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center",
              selectedModel === model.id ? "border-primary" : "border-slate-600"
            )}>
              {selectedModel === model.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white truncate">{model.name}</span>
                <span className="text-[10px] text-slate-600 shrink-0">{model.size}</span>
                {model.default && (
                  <span className="text-[9px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    Recommended
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {model.accuracy} · Min {model.minRAM} RAM
              </p>
              <div className="mt-1.5">
                {model.downloaded ? (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" /> Downloaded
                    </span>
                    {model.active && (
                      <span className="text-[10px] text-emerald-400 font-medium">· Active</span>
                    )}
                  </div>
                ) : downloading === model.id ? (
                  <div className="w-full space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#333] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${downloadProgress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-primary shrink-0 tabular-nums">{Math.round(downloadProgress)}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-slate-500">
                      {downloadStatus === "extracting" ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" /> Extracting model…
                        </span>
                      ) : (
                        <>
                          {downloadSpeed !== undefined && <span>{formatSpeed(downloadSpeed)}</span>}
                          {downloadEta !== undefined && downloadEta > 0 && <span>· {formatEta(downloadEta)}</span>}
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownload(model.id); }}
                    className="flex items-center gap-1.5 text-[10px] text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    <Download className="w-3 h-3" /> Download
                  </button>
                )}
              </div>
            </div>
          </button>
        ))}
        </div>
      </ScrollArea>

      {downloadError && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg mt-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400">{downloadError}</p>
        </div>
      )}
    </div>
  );
}

interface LLMStepProps {
  selectedProvider: string;
  providerConfigs: Record<string, AIProviderConfig>;
  onSelectProvider: (id: string) => void;
  onUpdateConfig: (id: string, config: Partial<AIProviderConfig>) => void;
}

const LLM_PROVIDERS = [
  {
    id: "ollama",
    name: "Ollama (Local)",
    desc: "Run models locally — llama3, codellama, mistral, etc.",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    desc: "Access thousands of models via API — Claude, GPT-4, Gemini, etc.",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "anthropic/claude-sonnet-4",
  },
  {
    id: "openai",
    name: "OpenAI",
    desc: "GPT-4o, GPT-4, GPT-3.5 — direct from OpenAI.",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
  },
];

function LLMStep({ selectedProvider, providerConfigs, onSelectProvider, onUpdateConfig }: LLMStepProps) {
  const handleSelect = (id: string) => {
    const preset = LLM_PROVIDERS.find((p) => p.id === id);
    if (!preset) return;
    onSelectProvider(id);
    // Initialize config if not already set
    if (!providerConfigs[id]) {
      onUpdateConfig(id, { apiKey: "", model: preset.defaultModel, baseUrl: preset.baseUrl });
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-white mb-2">LLM Provider</h2>
        <p className="text-sm text-slate-400">
          Choose how you want to run language models. Local is recommended for privacy.
        </p>
      </div>

      <div className="space-y-2 mb-6">
        {LLM_PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => handleSelect(p.id)}
            className={cn(
              "w-full flex items-start gap-3 p-4 rounded-xl border transition-colors text-left",
              selectedProvider === p.id
                ? "bg-primary/5 border-primary/30"
                : "bg-[#252525] border-[#333] hover:border-[#444]"
            )}
          >
            <div className={cn(
              "w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center",
              selectedProvider === p.id ? "border-primary" : "border-slate-600"
            )}>
              {selectedProvider === p.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
            <div className="flex-1">
              <span className="text-xs font-semibold text-white">{p.name}</span>
              <p className="text-[11px] text-slate-500 mt-0.5">{p.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {selectedProvider === "ollama" && (
        <div className="bg-[#252525] border border-[#333] rounded-xl p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-300 mb-2 block">Ollama Endpoint</label>
            <input
              type="text"
              value={providerConfigs.ollama?.baseUrl || "http://localhost:11434/v1"}
              onChange={(e) => onUpdateConfig("ollama", { baseUrl: e.target.value })}
              className="w-full bg-[#1E1E1E] border border-[#333] rounded-lg py-2 px-3 text-xs text-slate-300 outline-none focus:border-primary/40"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300 mb-2 block">Model</label>
            <input
              type="text"
              value={providerConfigs.ollama?.model || "llama3"}
              onChange={(e) => onUpdateConfig("ollama", { model: e.target.value })}
              placeholder="llama3"
              className="w-full bg-[#1E1E1E] border border-[#333] rounded-lg py-2 px-3 text-xs text-slate-300 placeholder:text-slate-600 outline-none focus:border-primary/40"
            />
          </div>
          <p className="text-[10px] text-slate-600">Make sure Ollama is running and the model is pulled.</p>
        </div>
      )}

      {selectedProvider === "openrouter" && (
        <div className="bg-[#252525] border border-[#333] rounded-xl p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-300 mb-2 block">OpenRouter API Key</label>
            <input
              type="password"
              value={providerConfigs.openrouter?.apiKey || ""}
              onChange={(e) => onUpdateConfig("openrouter", { apiKey: e.target.value })}
              placeholder="sk-or-..."
              className="w-full bg-[#1E1E1E] border border-[#333] rounded-lg py-2 px-3 text-xs text-slate-300 placeholder:text-slate-600 outline-none focus:border-primary/40"
            />
            <p className="text-[10px] text-slate-600 mt-2">
              Get your key at{" "}
              <a href="https://openrouter.ai/keys" target="_blank" className="text-primary hover:underline">
                openrouter.ai/keys
              </a>
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300 mb-2 block">Model</label>
            <input
              type="text"
              value={providerConfigs.openrouter?.model || "anthropic/claude-sonnet-4"}
              onChange={(e) => onUpdateConfig("openrouter", { model: e.target.value })}
              placeholder="anthropic/claude-sonnet-4"
              className="w-full bg-[#1E1E1E] border border-[#333] rounded-lg py-2 px-3 text-xs text-slate-300 placeholder:text-slate-600 outline-none focus:border-primary/40"
            />
          </div>
        </div>
      )}

      {selectedProvider === "openai" && (
        <div className="bg-[#252525] border border-[#333] rounded-xl p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-300 mb-2 block">OpenAI API Key</label>
            <input
              type="password"
              value={providerConfigs.openai?.apiKey || ""}
              onChange={(e) => onUpdateConfig("openai", { apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full bg-[#1E1E1E] border border-[#333] rounded-lg py-2 px-3 text-xs text-slate-300 placeholder:text-slate-600 outline-none focus:border-primary/40"
            />
            <p className="text-[10px] text-slate-600 mt-2">
              Get your key at{" "}
              <a href="https://platform.openai.com/api-keys" target="_blank" className="text-primary hover:underline">
                platform.openai.com
              </a>
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300 mb-2 block">Model</label>
            <input
              type="text"
              value={providerConfigs.openai?.model || "gpt-4o"}
              onChange={(e) => onUpdateConfig("openai", { model: e.target.value })}
              placeholder="gpt-4o"
              className="w-full bg-[#1E1E1E] border border-[#333] rounded-lg py-2 px-3 text-xs text-slate-300 placeholder:text-slate-600 outline-none focus:border-primary/40"
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface KeysStepProps {
  providerConfigs: Record<string, AIProviderConfig>;
  onUpdateConfig: (id: string, config: Partial<AIProviderConfig>) => void;
}

function KeysStep({ providerConfigs, onUpdateConfig }: KeysStepProps) {
  const providerMeta: Record<string, { label: string; placeholder: string; hint: string }> = {
    openrouter: { label: "OpenRouter", placeholder: "sk-or-...", hint: "Get key at openrouter.ai/keys" },
    openai: { label: "OpenAI", placeholder: "sk-...", hint: "Get key at platform.openai.com/api-keys" },
    ollama: { label: "Ollama", placeholder: "(not needed for local)", hint: "No API key required for local Ollama" },
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-white mb-2">API Keys (Optional)</h2>
        <p className="text-sm text-slate-400">
          Review and configure API keys for your providers. These are optional for local models.
        </p>
      </div>

      <div className="space-y-4">
        {Object.entries(providerConfigs).map(([id, config]) => {
          const meta = providerMeta[id] || { label: id, placeholder: "API key...", hint: "" };
          return (
            <div key={id} className="bg-[#252525] border border-[#333] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Key className="w-3.5 h-3.5 text-primary" />
                <label className="text-xs font-semibold text-white">{meta.label}</label>
              </div>
              <input
                type="password"
                value={config.apiKey || ""}
                onChange={(e) => onUpdateConfig(id, { apiKey: e.target.value })}
                placeholder={meta.placeholder}
                className="w-full bg-[#1E1E1E] border border-[#333] rounded-lg py-2 px-3 text-xs text-slate-300 placeholder:text-slate-600 outline-none focus:border-primary/40"
              />
              <p className="text-[10px] text-slate-600 mt-2">{meta.hint}</p>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-600 mt-4">
        Keys are stored locally and never leave your machine. You can manage them anytime in Settings.
      </p>
    </div>
  );
}

interface DoneStepProps {
  state: OnboardingState;
}

function DoneStep({ state }: DoneStepProps) {
  const providerLabels: Record<string, string> = {
    ollama: "Ollama (Local)",
    openrouter: "OpenRouter",
    openai: "OpenAI",
  };

  const keysConfigured = Object.values(state.providerConfigs).filter((c) => c.apiKey.length > 0).length;

  return (
    <div className="flex flex-col items-center text-center max-w-md mx-auto">
      <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mb-6">
        <Check className="w-10 h-10 text-emerald-400" />
      </div>
      <h1 className="text-2xl font-bold text-white mb-3">You're all set!</h1>
      <p className="text-sm text-slate-400 leading-relaxed mb-8">
        GetThatQuick is ready to go. Start a new chat, explore templates, or tweak settings anytime.
      </p>
      <div className="bg-[#252525] border border-[#333] rounded-xl p-4 w-full text-left space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Voice Model</span>
          <span className="text-slate-300">
            {state.voskDownloaded ? state.selectedVoskModel || "Downloaded" : "Skipped (can set later)"}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">LLM Provider</span>
          <span className="text-slate-300">
            {providerLabels[state.selectedProvider] || state.selectedProvider || "None selected"}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Model</span>
          <span className="text-slate-300">
            {state.providerConfigs[state.selectedProvider]?.model || "—"}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">API Keys</span>
          <span className="text-slate-300">{keysConfigured} configured</span>
        </div>
      </div>
    </div>
  );
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [saving, setSaving] = useState(false);

  // Onboarding state — accumulated across steps
  const [state, setState] = useState<OnboardingState>({
    selectedProvider: "openrouter",
    providerConfigs: {
      openrouter: { apiKey: "", model: "anthropic/claude-sonnet-4", baseUrl: "https://openrouter.ai/api/v1" },
      openai: { apiKey: "", model: "gpt-4o", baseUrl: "https://api.openai.com/v1" },
      ollama: { apiKey: "", model: "llama3", baseUrl: "http://localhost:11434/v1" },
    },
    selectedVoskModel: "",
    voskDownloaded: false,
  });

  // Load current settings on mount to pre-fill
  useEffect(() => {
    api.getSettings().then((settings) => {
      if (settings.ai?.providers && Object.keys(settings.ai.providers).length > 0) {
        setState((prev) => ({
          ...prev,
          selectedProvider: settings.ai.provider || prev.selectedProvider,
          providerConfigs: { ...prev.providerConfigs, ...settings.ai.providers },
        }));
      }
      if (settings.stt?.activeModel) {
        setState((prev) => ({ ...prev, selectedVoskModel: settings.stt.activeModel }));
      }
    }).catch(() => {});
  }, []);

  const handleSelectProvider = useCallback((id: string) => {
    setState((prev) => ({ ...prev, selectedProvider: id }));
  }, []);

  const handleUpdateConfig = useCallback((id: string, updates: Partial<AIProviderConfig>) => {
    setState((prev) => ({
      ...prev,
      providerConfigs: {
        ...prev.providerConfigs,
        [id]: { ...prev.providerConfigs[id], ...updates } as AIProviderConfig,
      },
    }));
  }, []);

  const handleSelectVoskModel = useCallback((id: string) => {
    setState((prev) => ({ ...prev, selectedVoskModel: id }));
  }, []);

  const handleModelDownloaded = useCallback(() => {
    setState((prev) => ({ ...prev, voskDownloaded: true }));
  }, []);

  const currentIndex = steps.findIndex((s) => s.id === currentStep);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === steps.length - 1;

  /** Save all settings to server and complete onboarding. */
  const handleFinish = async () => {
    setSaving(true);
    try {
      // Save AI provider settings
      await api.updateSettings({
        ai: {
          provider: state.selectedProvider,
          providers: state.providerConfigs,
        },
      });

      // Activate selected Vosk model if one was chosen
      if (state.selectedVoskModel) {
        await api.updateSettings({
          stt: { activeModel: state.selectedVoskModel, sampleRate: 16000 },
        });
      }

      onComplete();
    } catch (err) {
      console.error("[Onboarding] Failed to save:", err);
      // Still complete — user can fix in settings
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    if (isLast) {
      handleFinish();
      return;
    }
    setCurrentStep(steps[currentIndex + 1].id);
  };

  const goBack = () => {
    if (!isFirst) setCurrentStep(steps[currentIndex - 1].id);
  };

  /** Steps that can be skipped (non-essential setup). */
  const skippableSteps: Step[] = ["vosk", "keys"];
  const canSkip = skippableSteps.includes(currentStep);

  const renderStep = () => {
    switch (currentStep) {
      case "welcome":
        return <WelcomeStep />;
      case "vosk":
        return (
          <VoskStep
            selectedModel={state.selectedVoskModel}
            onSelectModel={handleSelectVoskModel}
            onModelDownloaded={handleModelDownloaded}
          />
        );
      case "llm":
        return (
          <LLMStep
            selectedProvider={state.selectedProvider}
            providerConfigs={state.providerConfigs}
            onSelectProvider={handleSelectProvider}
            onUpdateConfig={handleUpdateConfig}
          />
        );
      case "keys":
        return (
          <KeysStep
            providerConfigs={state.providerConfigs}
            onUpdateConfig={handleUpdateConfig}
          />
        );
      case "done":
        return <DoneStep state={state} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen w-screen bg-[#1E1E1E] flex flex-col">
      {/* Progress bar */}
      <div className="flex items-center justify-center gap-2 pt-8 pb-2">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2">
            <button
              onClick={() => i <= currentIndex && setCurrentStep(step.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors",
                i === currentIndex
                  ? "bg-primary/10 text-primary"
                  : i < currentIndex
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-slate-600"
              )}
            >
              <step.icon className="w-3 h-3" />
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "w-8 h-px",
                  i < currentIndex ? "bg-emerald-500/30" : "bg-[#333]"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center px-8 py-8">
          {renderStep()}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-8 py-6 max-w-lg mx-auto w-full">
        <button
          onClick={goBack}
          disabled={isFirst}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-colors",
            isFirst
              ? "text-slate-700 cursor-not-allowed"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back
        </button>

        <div className="flex items-center gap-3">
          {canSkip && (
            <button
              onClick={goNext}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Skip
            </button>
          )}

          <button
            onClick={goNext}
            disabled={saving}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:brightness-110 transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </>
            ) : isLast ? (
              "Get Started"
            ) : (
              <>
                Continue
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
