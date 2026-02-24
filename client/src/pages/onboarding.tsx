import { useState } from "react";
import {
  Zap,
  Mic,
  Key,
  Server,
  ChevronRight,
  ChevronLeft,
  Check,
  Upload,
  FolderOpen,
  Globe,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

function WelcomeStep() {
  return (
    <div className="flex flex-col items-center text-center max-w-md mx-auto">
      <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6">
        <Zap className="w-10 h-10 text-primary" />
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

function VoskStep() {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const models = [
    { id: "small", name: "vosk-model-small-en-us", size: "40 MB", desc: "Fast, lightweight — great for most use cases", recommended: true },
    { id: "medium", name: "vosk-model-en-us", size: "1.8 GB", desc: "High accuracy, slower on low-end hardware" },
    { id: "custom", name: "Custom model path", size: "—", desc: "Point to your own Vosk model directory" },
  ];

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-white mb-2">Voice Model (Vosk)</h2>
        <p className="text-sm text-slate-400">
          Select a speech-to-text model for voice input. You can change this later in settings.
        </p>
      </div>

      <div className="space-y-2 mb-6">
        {models.map((model) => (
          <button
            key={model.id}
            onClick={() => setSelectedModel(model.id)}
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
                <span className="text-xs font-semibold text-white">{model.name}</span>
                <span className="text-[10px] text-slate-600">{model.size}</span>
                {"recommended" in model && model.recommended && (
                  <span className="text-[9px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    Recommended
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{model.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {selectedModel === "custom" && (
        <div className="bg-[#252525] border border-[#333] rounded-xl p-4">
          <label className="text-xs font-medium text-slate-300 mb-2 block">Model Directory</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="/path/to/vosk-model"
              className="flex-1 bg-[#1E1E1E] border border-[#333] rounded-lg py-2 px-3 text-xs text-slate-300 placeholder:text-slate-600 outline-none focus:border-primary/40"
            />
            <button className="px-3 py-2 rounded-lg bg-white/5 text-slate-300 text-xs hover:bg-white/8 transition-colors">
              <FolderOpen className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {selectedModel && selectedModel !== "custom" && (
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
          <Upload className="w-3.5 h-3.5" />
          Download Model
        </button>
      )}
    </div>
  );
}

function LLMStep() {
  const [provider, setProvider] = useState<string | null>(null);

  const providers = [
    { id: "ollama", name: "Ollama (Local)", desc: "Run models locally — llama3, codellama, mistral, etc.", default: "http://localhost:11434" },
    { id: "openrouter", name: "OpenRouter", desc: "Access thousands of models via API — Claude, GPT-4, Gemini, etc.", default: "" },
    { id: "custom", name: "Custom Endpoint", desc: "Any OpenAI-compatible API endpoint", default: "" },
  ];

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-white mb-2">LLM Provider</h2>
        <p className="text-sm text-slate-400">
          Choose how you want to run language models. Local is recommended for privacy.
        </p>
      </div>

      <div className="space-y-2 mb-6">
        {providers.map((p) => (
          <button
            key={p.id}
            onClick={() => setProvider(p.id)}
            className={cn(
              "w-full flex items-start gap-3 p-4 rounded-xl border transition-colors text-left",
              provider === p.id
                ? "bg-primary/5 border-primary/30"
                : "bg-[#252525] border-[#333] hover:border-[#444]"
            )}
          >
            <div className={cn(
              "w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center",
              provider === p.id ? "border-primary" : "border-slate-600"
            )}>
              {provider === p.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
            <div className="flex-1">
              <span className="text-xs font-semibold text-white">{p.name}</span>
              <p className="text-[11px] text-slate-500 mt-0.5">{p.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {provider === "ollama" && (
        <div className="bg-[#252525] border border-[#333] rounded-xl p-4">
          <label className="text-xs font-medium text-slate-300 mb-2 block">Ollama Endpoint</label>
          <input
            type="text"
            defaultValue="http://localhost:11434"
            className="w-full bg-[#1E1E1E] border border-[#333] rounded-lg py-2 px-3 text-xs text-slate-300 outline-none focus:border-primary/40"
          />
          <p className="text-[10px] text-slate-600 mt-2">Make sure Ollama is running and accessible</p>
        </div>
      )}

      {provider === "openrouter" && (
        <div className="bg-[#252525] border border-[#333] rounded-xl p-4">
          <label className="text-xs font-medium text-slate-300 mb-2 block">OpenRouter API Key</label>
          <input
            type="password"
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
      )}

      {provider === "custom" && (
        <div className="bg-[#252525] border border-[#333] rounded-xl p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-300 mb-2 block">API Endpoint</label>
            <input
              type="text"
              placeholder="https://api.example.com/v1"
              className="w-full bg-[#1E1E1E] border border-[#333] rounded-lg py-2 px-3 text-xs text-slate-300 placeholder:text-slate-600 outline-none focus:border-primary/40"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-300 mb-2 block">API Key (optional)</label>
            <input
              type="password"
              placeholder="sk-..."
              className="w-full bg-[#1E1E1E] border border-[#333] rounded-lg py-2 px-3 text-xs text-slate-300 placeholder:text-slate-600 outline-none focus:border-primary/40"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function KeysStep() {
  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-white mb-2">API Keys (Optional)</h2>
        <p className="text-sm text-slate-400">
          Add any additional API keys you'd like to configure. These are optional and can be set later.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-[#252525] border border-[#333] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Key className="w-3.5 h-3.5 text-primary" />
            <label className="text-xs font-semibold text-white">OpenRouter</label>
          </div>
          <input
            type="password"
            placeholder="sk-or-..."
            className="w-full bg-[#1E1E1E] border border-[#333] rounded-lg py-2 px-3 text-xs text-slate-300 placeholder:text-slate-600 outline-none focus:border-primary/40"
          />
        </div>

        <div className="bg-[#252525] border border-[#333] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Key className="w-3.5 h-3.5 text-primary" />
            <label className="text-xs font-semibold text-white">OpenAI</label>
          </div>
          <input
            type="password"
            placeholder="sk-..."
            className="w-full bg-[#1E1E1E] border border-[#333] rounded-lg py-2 px-3 text-xs text-slate-300 placeholder:text-slate-600 outline-none focus:border-primary/40"
          />
        </div>

        <div className="bg-[#252525] border border-[#333] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Key className="w-3.5 h-3.5 text-primary" />
            <label className="text-xs font-semibold text-white">Anthropic</label>
          </div>
          <input
            type="password"
            placeholder="sk-ant-..."
            className="w-full bg-[#1E1E1E] border border-[#333] rounded-lg py-2 px-3 text-xs text-slate-300 placeholder:text-slate-600 outline-none focus:border-primary/40"
          />
        </div>

        <div className="bg-[#252525] border border-[#333] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Key className="w-3.5 h-3.5 text-primary" />
            <label className="text-xs font-semibold text-white">Google AI (Gemini)</label>
          </div>
          <input
            type="password"
            placeholder="AIza..."
            className="w-full bg-[#1E1E1E] border border-[#333] rounded-lg py-2 px-3 text-xs text-slate-300 placeholder:text-slate-600 outline-none focus:border-primary/40"
          />
        </div>
      </div>

      <p className="text-[11px] text-slate-600 mt-4">
        Keys are stored locally and never leave your machine. You can manage them anytime in Settings.
      </p>
    </div>
  );
}

function DoneStep() {
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
          <span className="text-slate-300">vosk-model-small-en-us</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">LLM Provider</span>
          <span className="text-slate-300">Ollama (Local)</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">API Keys</span>
          <span className="text-slate-300">0 configured</span>
        </div>
      </div>
    </div>
  );
}

const stepComponents: Record<Step, React.ComponentType> = {
  welcome: WelcomeStep,
  vosk: VoskStep,
  llm: LLMStep,
  keys: KeysStep,
  done: DoneStep,
};

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState<Step>("welcome");

  const currentIndex = steps.findIndex((s) => s.id === currentStep);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === steps.length - 1;

  const goNext = () => {
    if (isLast) {
      onComplete();
      return;
    }
    setCurrentStep(steps[currentIndex + 1].id);
  };

  const goBack = () => {
    if (!isFirst) setCurrentStep(steps[currentIndex - 1].id);
  };

  const Content = stepComponents[currentStep];

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
      <div className="flex-1 flex items-center justify-center px-8 overflow-y-auto">
        <Content />
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

        <button
          onClick={goNext}
          className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:brightness-110 transition-all"
        >
          {isLast ? "Get Started" : "Continue"}
          {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
