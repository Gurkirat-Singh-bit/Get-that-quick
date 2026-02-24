// ── LLM service — OpenAI-compatible client for AI providers ──────────────
//
// Uses the `openai` npm package which works with OpenRouter, OpenAI,
// Ollama, LM Studio, vLLM, and any other OpenAI-compatible endpoint.
//
// API keys are stored server-side in settings.json.
// The browser never talks to LLM providers directly.

import OpenAI from "openai";
import { getSettings } from "./config";
import type { AIProviderConfig } from "@shared/types";

// ── Client builder ────────────────────────────────────────────────────────

function buildClient(providerOverride?: string): {
  client: OpenAI;
  model: string;
} {
  const settings = getSettings();
  const name = providerOverride ?? settings.ai.provider;
  const provider = settings.ai.providers[name];

  if (!provider) {
    throw new Error(`AI provider "${name}" is not configured.`);
  }
  if (!provider.apiKey && !provider.baseUrl.includes("localhost")) {
    throw new Error(
      `No API key set for provider "${name}". Add it in Settings.`
    );
  }
  if (!provider.model) {
    throw new Error(`No model selected for provider "${name}".`);
  }

  const client = new OpenAI({
    apiKey: provider.apiKey || "none",
    baseURL: provider.baseUrl,
  });

  return { client, model: provider.model };
}

// ── Generation ────────────────────────────────────────────────────────────

/** Stream tokens from the LLM. Yields string chunks. */
export async function* generateStream(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  providerOverride?: string
): AsyncGenerator<string> {
  const { client, model } = buildClient(providerOverride);

  const stream = await client.chat.completions.create({
    model,
    stream: true,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

/** Non-streaming generation. Returns the full response string. */
export async function generate(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  providerOverride?: string
): Promise<string> {
  const { client, model } = buildClient(providerOverride);

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
  });

  return response.choices[0]?.message?.content ?? "";
}

// ── Test ──────────────────────────────────────────────────────────────────

/** Quick ping to verify a provider config is valid. */
export async function testProvider(
  config: AIProviderConfig
): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = new OpenAI({
      apiKey: config.apiKey || "none",
      baseURL: config.baseUrl,
    });

    const res = await client.chat.completions.create({
      model: config.model,
      messages: [{ role: "user", content: "Say 'ok'" }],
      max_tokens: 5,
    });

    return { ok: !!res.choices[0]?.message?.content };
  } catch (err: any) {
    return { ok: false, error: err.message ?? String(err) };
  }
}
