// ── Constants & defaults ──────────────────────────────────────────────────

import type { Settings } from "@shared/types";

/** Vosk requires 16 kHz mono PCM. */
export const SAMPLE_RATE = 16_000;

/** HTTP / WebSocket listen port. */
export const PORT = Number(process.env.PORT) || 3000;

/** Default settings written on first launch. */
export const DEFAULT_SETTINGS: Settings = {
  ai: {
    provider: "openrouter",
    providers: {
      openrouter: {
        apiKey: "",
        model: "anthropic/claude-sonnet-4",
        baseUrl: "https://openrouter.ai/api/v1",
      },
      openai: {
        apiKey: "",
        model: "gpt-4o",
        baseUrl: "https://api.openai.com/v1",
      },
      ollama: {
        apiKey: "",
        model: "llama3",
        baseUrl: "http://localhost:11434/v1",
      },
    },
  },
  stt: {
    activeModel: "vosk-model-small-en-us-0.15",
    sampleRate: SAMPLE_RATE,
  },
  general: {
    theme: "dark",
  },
  onboarding: {
    completed: false,
  },
};
