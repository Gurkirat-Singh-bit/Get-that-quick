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
  options?: { temperature?: number; maxTokens?: number; thinkingEnabled?: boolean },
  providerOverride?: string
): AsyncGenerator<string> {
  const { client, model } = buildClient(providerOverride);

  const params: Record<string, unknown> = {
    model,
    stream: true,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
  };

  if (options?.temperature != null) params.temperature = options.temperature;
  if (options?.maxTokens && options.maxTokens > 0) params.max_tokens = options.maxTokens;

  // Extended thinking support (Anthropic via OpenRouter / Claude)
  if (options?.thinkingEnabled) {
    // OpenRouter / Anthropic extended thinking header
    params.include_reasoning = true;
  }

  const stream = await client.chat.completions.create(params as any);

  let inThinking = false;

  for await (const chunk of stream as any) {
    // Handle thinking/reasoning tokens from some providers
    const reasoning = chunk.choices?.[0]?.delta?.reasoning;
    if (reasoning) {
      if (!inThinking) {
        yield "<think>";
        inThinking = true;
      }
      yield reasoning;
    }
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) {
      if (inThinking) {
        yield "</think>\n\n";
        inThinking = false;
      }
      yield delta;
    }
  }

  // Close thinking block if stream ended while still in reasoning
  if (inThinking) {
    yield "</think>\n\n";
  }
}

/** Non-streaming generation. Returns the full response string. */
export async function generate(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  options?: { temperature?: number; maxTokens?: number; thinkingEnabled?: boolean },
  providerOverride?: string
): Promise<string> {
  const { client, model } = buildClient(providerOverride);

  const params: Record<string, unknown> = {
    model,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
  };

  if (options?.temperature != null) params.temperature = options.temperature;
  if (options?.maxTokens && options.maxTokens > 0) params.max_tokens = options.maxTokens;
  if (options?.thinkingEnabled) {
    params.include_reasoning = true;
  }

  const response = await client.chat.completions.create(params as any);

  let result = "";
  const choice = (response as any).choices?.[0];
  if (choice?.message?.reasoning) {
    result += `<think>${choice.message.reasoning}</think>\n\n`;
  }
  result += choice?.message?.content ?? "";
  return result;
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

// ── Model listing ─────────────────────────────────────────────────────────

/** Fetch available models from a provider's /models endpoint. */
export async function listProviderModels(
  providerName?: string
): Promise<{ id: string; name: string }[]> {
  const settings = getSettings();
  const name = providerName ?? settings.ai.provider;
  const provider = settings.ai.providers[name];

  if (!provider) {
    throw new Error(`Provider "${name}" is not configured.`);
  }

  const client = new OpenAI({
    apiKey: provider.apiKey || "none",
    baseURL: provider.baseUrl,
  });

  try {
    const models = await client.models.list();
    const results: { id: string; name: string }[] = [];
    for await (const m of models) {
      results.push({ id: m.id, name: m.id });
    }
    // Sort alphabetically
    results.sort((a, b) => a.id.localeCompare(b.id));
    return results;
  } catch (err: any) {
    throw new Error(`Failed to list models: ${err.message ?? String(err)}`);
  }
}
