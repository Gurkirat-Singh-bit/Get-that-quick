/**
 * @fileoverview Server-wide constants and default settings.
 *
 * Defines the Vosk sample rate, server port, and the default
 * `settings.json` values written on a fresh install.
 *
 * @module lib/constants
 * @license CC BY-NC 4.0 — {@link https://creativecommons.org/licenses/by-nc/4.0/}
 * @author Gurkirat Singh
 * @created 2026-02-25
 * @updated 2026-03-03
 */

import type { Settings } from "@shared/types";

/**
 * Vosk requires 16 kHz mono PCM.
 * This is the sample rate for all audio processing.
 */
export const SAMPLE_RATE = 16_000;

/**
 * HTTP / WebSocket listen port.
 * Can be overridden with PORT environment variable.
 */
export const PORT = Number(process.env.PORT) || 3000;

/**
 * Default settings written on first launch.
 * Provides sensible defaults for all configuration options.
 */
export const DEFAULT_SETTINGS: Settings = {
  ai: {
    provider: "",
    providers: {},
    systemPrompt: `You are GetThatQuick — a fast, precise, and knowledgeable AI assistant.

## Core Behavior
- Answer directly. No preambles like "I'll help you" or "Let me explain".
- Be extremely concise. Get straight to the point.
- When asked to do something, just do it. Don't ask permission or clarifying questions unless the request is genuinely ambiguous.
- No elaborate thinking sections. Think internally, respond externally.
- For code: produce clean, working code with minimal explanation.
- Format: markdown, code blocks, lists. Keep it scannable.

## Never Do
- Don't generate "Thinking" sections or internal monologue
- Don't ask multiple clarifying questions for simple requests
- Don't explain what you're about to do before doing it
- Don't be verbose when brief will do

You're running locally. Be direct and technical.`,
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
