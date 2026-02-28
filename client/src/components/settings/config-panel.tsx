/**
 * @fileoverview Inline config panel for the right sidebar.
 *
 * Quick access to generation settings: system prompt,
 * positive/negative prompts, temperature, and max tokens.
 *
 * @module components/settings/config-panel
 */

import { useState, useEffect } from "react";
import { Thermometer, Hash, MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";
import type { Settings } from "@shared/types";

interface ConfigPanelProps {
  settings: Settings | null;
  onUpdateSettings: (updates: Partial<Settings>) => Promise<void>;
}

export function ConfigPanel({ settings, onUpdateSettings }: ConfigPanelProps) {
  const ai = settings?.ai;

  // Local state for text fields to debounce updates
  const [systemPrompt, setSystemPrompt] = useState(ai?.systemPrompt ?? "");
  const [positivePrompt, setPositivePrompt] = useState(ai?.positivePrompt ?? "");
  const [negativePrompt, setNegativePrompt] = useState(ai?.negativePrompt ?? "");
  const [temperature, setTemperature] = useState(ai?.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(ai?.maxTokens ?? 0);

  // Sync from upstream settings when they change
  useEffect(() => {
    if (ai) {
      setSystemPrompt(ai.systemPrompt ?? "");
      setPositivePrompt(ai.positivePrompt ?? "");
      setNegativePrompt(ai.negativePrompt ?? "");
      setTemperature(ai.temperature ?? 0.7);
      setMaxTokens(ai.maxTokens ?? 0);
    }
  }, [ai]);

  const updateField = (field: string, value: string | number) => {
    if (settings) {
      onUpdateSettings({ ai: { ...settings.ai, [field]: value } });
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0A0A0B] text-zinc-300">
      {/* Header */}
      <div className="px-4 py-4 border-b border-white/10">
        <h2 className="text-sm font-bold text-white tracking-tight">Generation Config</h2>
        <p className="text-[11px] text-zinc-500 mt-0.5">Fine-tune AI behavior</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
        {/* System Prompt */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 mb-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            System Prompt
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            onBlur={() => updateField("systemPrompt", systemPrompt)}
            rows={5}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none leading-relaxed"
            placeholder="Instructions for the AI…"
          />
        </div>

        {/* Positive Prompt */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 mb-1.5">
            <ThumbsUp className="w-3.5 h-3.5" />
            Positive Prompt
          </label>
          <textarea
            value={positivePrompt}
            onChange={(e) => setPositivePrompt(e.target.value)}
            onBlur={() => updateField("positivePrompt", positivePrompt)}
            rows={3}
            className="w-full rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 resize-none leading-relaxed"
            placeholder="Things to emphasize… e.g. 'Be thorough, include examples, use TypeScript'"
          />
        </div>

        {/* Negative Prompt */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-red-400 mb-1.5">
            <ThumbsDown className="w-3.5 h-3.5" />
            Negative Prompt
          </label>
          <textarea
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            onBlur={() => updateField("negativePrompt", negativePrompt)}
            rows={3}
            className="w-full rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-red-500/40 resize-none leading-relaxed"
            placeholder="Things to avoid… e.g. 'No verbose explanations, avoid deprecated APIs'"
          />
        </div>

        {/* Temperature */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 mb-1.5">
            <Thermometer className="w-3.5 h-3.5" />
            Temperature
            <span className="ml-auto text-[11px] text-zinc-500 font-mono">{temperature.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={temperature}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setTemperature(v);
            }}
            onMouseUp={() => updateField("temperature", temperature)}
            onTouchEnd={() => updateField("temperature", temperature)}
            className="w-full accent-primary h-1.5 rounded-full appearance-none bg-white/10 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
            <span>Precise</span>
            <span>Creative</span>
          </div>
        </div>

        {/* Max Tokens */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 mb-1.5">
            <Hash className="w-3.5 h-3.5" />
            Max Tokens
            <span className="ml-auto text-[11px] text-zinc-500 font-mono">{maxTokens || "auto"}</span>
          </label>
          <input
            type="number"
            min={0}
            max={128000}
            step={256}
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value) || 0)}
            onBlur={() => updateField("maxTokens", maxTokens)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-primary/40"
            placeholder="0 = provider default"
          />
        </div>
      </div>
    </div>
  );
}
