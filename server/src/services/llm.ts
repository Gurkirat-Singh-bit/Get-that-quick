/**
 * @fileoverview LLM (AI) generation service.
 *
 * Thin wrapper around the `openai` package that works with any
 * OpenAI-compatible endpoint: OpenAI, OpenRouter, Ollama, LM Studio, etc.
 *
 * API keys live server-side in `settings.json`.
 * The browser never contacts the AI provider directly.
 *
 * @module services/llm
 * @license CC BY-NC 4.0 — {@link https://creativecommons.org/licenses/by-nc/4.0/}
 * @author Gurkirat Singh
 * @created 2026-02-25
 * @updated 2026-03-03
 */

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

// ── GitHub Copilot token cache ─────────────────────────────────────────────

/** In-memory cache for the short-lived Copilot API token. */
const copilotTokenCache: Record<string, { token: string; expiresAt: number }> = {};

/**
 * Exchange a GitHub OAuth token (gho_...) for a short-lived Copilot API token.
 * Caches the result and reuses it until 5 minutes before expiry.
 *
 * @param githubToken - The long-lived OAuth token from the device flow.
 * @returns A short-lived Copilot API token.
 */
export async function getCopilotToken(githubToken: string): Promise<string> {
  if (!githubToken) {
    throw new Error("GitHub Copilot is not authenticated. Connect it in Settings → Models & LLM.");
  }

  const cached = copilotTokenCache[githubToken];
  const now = Date.now() / 1000;

  // Evict expired cache entries to prevent unbounded growth
  for (const [key, val] of Object.entries(copilotTokenCache)) {
    if (val.expiresAt < now) delete copilotTokenCache[key];
  }

  // Reuse if still valid with 5-minute buffer
  if (cached && cached.expiresAt > now + 300) {
    return cached.token;
  }

  const res = await fetch("https://api.github.com/copilot_internal/v2/token", {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      "Editor-Version": "vscode/1.95.0",
      "Editor-Plugin-Version": "copilot-chat/0.22.4",
      "User-Agent": "GitHubCopilotChat/0.22.4",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to get Copilot token: ${res.status} ${body}`);
  }

  const data = await res.json() as { token: string; expires_at: number };
  copilotTokenCache[githubToken] = {
    token: data.token,
    expiresAt: data.expires_at,
  };

  return data.token;
}

// ── Client builder ────────────────────────────────────────────────────────
/**
 * Build an OpenAI client from the current settings or a named provider override.
 *
 * @param providerOverride - Optional provider name. Defaults to the active provider.
 * @returns Object with the OpenAI client and the model name to use.
 * @throws {Error} If the provider is not configured or no model is selected.
 */
async function buildClient(providerOverride?: string): Promise<{
  client: OpenAI;
  model: string;
}> {
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

  const isOpenRouter = provider.baseUrl.includes("openrouter.ai");
  const isCopilot = provider.baseUrl.includes("api.githubcopilot.com");

  let apiKey = provider.apiKey || "none";
  let extraHeaders: Record<string, string> | undefined;

  if (isCopilot) {
    // Exchange the stored GitHub OAuth token for a short-lived Copilot token
    const copilotToken = await getCopilotToken(provider.apiKey);
    apiKey = copilotToken;
    extraHeaders = {
      "Copilot-Integration-Id": "vscode-chat",
      "Editor-Version": "vscode/1.95.0",
      "Editor-Plugin-Version": "copilot-chat/0.22.4",
      "User-Agent": "GitHubCopilotChat/0.22.4",
    };
  } else if (isOpenRouter) {
    extraHeaders = {
      "HTTP-Referer": "https://getthatquick.app",
      "X-Title": "GetThatQuick",
    };
  }

  const client = new OpenAI({
    apiKey,
    baseURL: provider.baseUrl,
    defaultHeaders: extraHeaders,
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
  const { client, model } = await buildClient(providerOverride);

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
  const { client, model } = await buildClient(providerOverride);

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
    const isOpenRouter = config.baseUrl.includes("openrouter.ai");
    const isCopilot = config.baseUrl.includes("api.githubcopilot.com");

    let apiKey = config.apiKey || "none";
    let extraHeaders: Record<string, string> | undefined;

    if (isCopilot) {
      const copilotToken = await getCopilotToken(config.apiKey);
      apiKey = copilotToken;
      extraHeaders = {
        "Copilot-Integration-Id": "vscode-chat",
        "Editor-Version": "vscode/1.95.0",
        "Editor-Plugin-Version": "copilot-chat/0.22.4",
        "User-Agent": "GitHubCopilotChat/0.22.4",
      };
    } else if (isOpenRouter) {
      extraHeaders = {
        "HTTP-Referer": "https://getthatquick.app",
        "X-Title": "GetThatQuick",
      };
    }

    const client = new OpenAI({
      apiKey,
      baseURL: config.baseUrl,
      defaultHeaders: extraHeaders,
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

  const isOpenRouter = provider.baseUrl.includes("openrouter.ai");
  const isCopilot = provider.baseUrl.includes("api.githubcopilot.com");

  let apiKey = provider.apiKey || "none";
  let extraHeaders: Record<string, string> | undefined;

  if (isCopilot) {
    const copilotToken = await getCopilotToken(provider.apiKey);
    apiKey = copilotToken;
    extraHeaders = {
      "Copilot-Integration-Id": "vscode-chat",
      "Editor-Version": "vscode/1.95.0",
      "Editor-Plugin-Version": "copilot-chat/0.22.4",
      "User-Agent": "GitHubCopilotChat/0.22.4",
    };
  } else if (isOpenRouter) {
    extraHeaders = {
      "HTTP-Referer": "https://getthatquick.app",
      "X-Title": "GetThatQuick",
    };
  }

  const client = new OpenAI({
    apiKey,
    baseURL: provider.baseUrl,
    defaultHeaders: extraHeaders,
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
