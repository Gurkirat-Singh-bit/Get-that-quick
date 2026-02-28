// ── Constants & defaults ──────────────────────────────────────────────────

import type { Settings } from "@shared/types";

/** Vosk requires 16 kHz mono PCM. */
export const SAMPLE_RATE = 16_000;

/** HTTP / WebSocket listen port. */
export const PORT = Number(process.env.PORT) || 3000;

/** Default settings written on first launch. */
export const DEFAULT_SETTINGS: Settings = {
  ai: {
    provider: "",
    providers: {},
    systemPrompt: `You are GetThatQuick — a fast, precise, and knowledgeable AI assistant built into a self-hosted prompt workbench.

Your core principles:
- Be concise and direct. Skip filler phrases.
- When asked to code, produce clean, production-ready code with brief explanations.
- Use markdown formatting: headings, lists, code blocks, tables when helpful.
- If unsure, say so honestly rather than guessing.
- For complex tasks, break them into numbered steps.
- Always prioritize accuracy over verbosity.

You are running locally on the user's machine, so you can be candid and technical.`,
    temperature: 0.7,
    maxTokens: 0,
    thinkingEnabled: true,
    planMode: false,
    positivePrompt: "",
    negativePrompt: "",
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
