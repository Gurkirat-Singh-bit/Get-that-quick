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
import type { ChatCompletionChunk, ChatCompletion } from "openai/resources";
import type { Stream } from "openai/streaming";

// ── Type extensions for OpenRouter/extended thinking ─────────────────────

type ExtendedChatCompletionChunk = ChatCompletionChunk & {
  choices: Array<{
    delta?: {
      reasoning?: string;
      content?: string | null;
    };
    index: number;
    finish_reason: string | null;
    logprobs?: unknown;
  }>;
};

type ExtendedChatCompletion = Omit<ChatCompletion, 'choices'> & {
  choices: Array<{
    message: {
      reasoning?: string;
      content: string | null;
      role: string;
    };
    index: number;
    finish_reason: string | null;
    logprobs?: unknown;
  }>;
};

interface ExtendedCompletionParams {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  include_reasoning?: boolean;
}

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

/**
 * Stream tokens from the LLM. Yields string chunks.
 *
 * @param systemPrompt - System prompt to set context/behavior.
 * @param messages - Conversation history (user/assistant messages).
 * @param options - Optional generation parameters (temperature, maxTokens, thinkingEnabled).
 * @param providerOverride - Optional provider name to use instead of the active one.
 * @yields String chunks as they arrive from the LLM.
 * @throws {Error} If provider is not configured or model is not set.
 */
export async function* generateStream(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  options?: { temperature?: number; maxTokens?: number; thinkingEnabled?: boolean },
  providerOverride?: string
): AsyncGenerator<string> {
  const { client, model } = buildClient(providerOverride);

  const params: ExtendedCompletionParams = {
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

  const stream = await client.chat.completions.create(params as OpenAI.ChatCompletionCreateParams) as Stream<ChatCompletionChunk>;

  let inThinking = false;

  for await (const chunk of stream) {
    const extendedChunk = chunk as unknown as ExtendedChatCompletionChunk;
    // Handle thinking/reasoning tokens from some providers
    const reasoning = extendedChunk.choices?.[0]?.delta?.reasoning;
    if (reasoning) {
      if (!inThinking) {
        yield "<think>";
        inThinking = true;
      }
      yield reasoning;
    }
    const delta = extendedChunk.choices?.[0]?.delta?.content;
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

/**
 * Non-streaming generation. Returns the full response string.
 *
 * @param systemPrompt - System prompt to set context/behavior.
 * @param messages - Conversation history (user/assistant messages).
 * @param options - Optional generation parameters (temperature, maxTokens, thinkingEnabled).
 * @param providerOverride - Optional provider name to use instead of the active one.
 * @returns The complete LLM response as a single string.
 * @throws {Error} If provider is not configured or model is not set.
 */
export async function generate(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  options?: { temperature?: number; maxTokens?: number; thinkingEnabled?: boolean },
  providerOverride?: string
): Promise<string> {
  const { client, model } = buildClient(providerOverride);

  const params: ExtendedCompletionParams = {
    model,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
  };

  if (options?.temperature != null) params.temperature = options.temperature;
  if (options?.maxTokens && options.maxTokens > 0) params.max_tokens = options.maxTokens;
  if (options?.thinkingEnabled) {
    params.include_reasoning = true;
  }

  const response = await client.chat.completions.create(params as OpenAI.ChatCompletionCreateParams);
  const extendedResponse = response as unknown as ExtendedChatCompletion;

  let result = "";
  const choice = extendedResponse.choices?.[0];
  if (choice?.message?.reasoning) {
    result += `<think>${choice.message.reasoning}</think>\n\n`;
  }
  result += choice?.message?.content ?? "";
  return result;
}

// ── Test ──────────────────────────────────────────────────────────────────

/**
 * Quick ping to verify a provider config is valid.
 * Sends a minimal request to test connectivity and authentication.
 *
 * @param config - Provider configuration to test.
 * @returns Object with ok flag and optional error message.
 */
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

// ── Model listing ─────────────────────────────────────────────────────────

/**
 * Fetch available models from a provider's /models endpoint.
 *
 * @param providerName - Optional provider name. Uses active provider if not specified.
 * @returns Array of model objects with id and name.
 * @throws {Error} If provider is not configured or API call fails.
 */
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to list models: ${message}`);
  }
}
