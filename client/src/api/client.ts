/**
 * @fileoverview API client for the GetThatQuick server.
 *
 * Provides a typed, centralised HTTP client that handles all REST
 * communication with the backend.  Every endpoint returns the unwrapped
 * `data` payload or throws an {@link ApiClientError} on failure.
 *
 * @module api/client
 */

import type {
  Session,
  SessionMeta,
  Template,
  TemplateMeta,
  Settings,
  VoskModelInfo,
  GenerateRequest,
  ApiResponse,
  ApiError,
} from "@shared/types";

/** Base URL for the API — same origin in production, proxied in dev. */
const BASE = "/api";

/**
 * Custom error thrown when the API responds with `{ ok: false }`.
 *
 * @extends Error
 */
export class ApiClientError extends Error {
  /** HTTP status code from the response. */
  status: number;

  /**
   * @param message - Human-readable error description from the API.
   * @param status  - HTTP status code.
   */
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

/**
 * Internal helper – sends a request and unwraps the JSON envelope.
 *
 * @template T  The expected shape of `data` inside `ApiResponse<T>`.
 * @param path    - Relative path appended to {@link BASE} (e.g. `/sessions`).
 * @param options - Standard `RequestInit` overrides.
 * @returns The unwrapped `data` value from the API.
 * @throws {ApiClientError} If the response is not ok.
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  const body = (await res.json()) as ApiResponse<T> | ApiError;

  if (!body.ok) {
    throw new ApiClientError((body as ApiError).error, res.status);
  }

  return (body as ApiResponse<T>).data;
}

// ── Sessions ────────────────────────────────────────────────────────────

/**
 * Fetch all session metadata, sorted newest-first.
 *
 * @returns An array of {@link SessionMeta} objects.
 */
export function listSessions(): Promise<SessionMeta[]> {
  return request<SessionMeta[]>("/sessions");
}

/**
 * Fetch a single session with full message history.
 *
 * @param id - The session identifier (e.g. `sess_abc123`).
 * @returns The complete {@link Session} object.
 */
export function getSession(id: string): Promise<Session> {
  return request<Session>(`/sessions/${id}`);
}

/**
 * Create a new chat session.
 *
 * @param opts        - Optional creation parameters.
 * @param opts.title  - Display title; defaults to "New Chat" on the server.
 * @param opts.templateId - Optional template to pre-load as system prompt.
 * @returns The newly created {@link Session}.
 */
export function createSession(opts: {
  title?: string;
  templateId?: string;
} = {}): Promise<Session> {
  return request<Session>("/sessions", {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

/**
 * Update an existing session (title, messages, etc.).
 *
 * @param id      - Session identifier.
 * @param updates - Partial session fields to merge.
 * @returns The updated {@link Session}.
 */
export function updateSession(
  id: string,
  updates: Partial<Session>
): Promise<Session> {
  return request<Session>(`/sessions/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

/**
 * Permanently delete a session and its messages.
 *
 * @param id - Session identifier.
 */
export function deleteSession(id: string): Promise<null> {
  return request<null>(`/sessions/${id}`, { method: "DELETE" });
}

// ── Templates ───────────────────────────────────────────────────────────

/**
 * Fetch metadata for all templates (local + community).
 *
 * @returns An array of {@link TemplateMeta} objects sorted by title.
 */
export function listTemplates(): Promise<TemplateMeta[]> {
  return request<TemplateMeta[]>("/templates");
}

/**
 * Fetch a single template including its full content (system prompt).
 *
 * @param id - Template identifier (e.g. `tmpl_xyz`).
 * @returns The complete {@link Template}.
 */
export function getTemplate(id: string): Promise<Template> {
  return request<Template>(`/templates/${id}`);
}

/**
 * Create a new local template.
 *
 * @param tmpl - Template data. `title` and `content` are required.
 * @returns The created {@link Template}.
 */
export function createTemplate(tmpl: {
  title: string;
  content: string;
  description?: string;
  category?: string;
  tags?: string[];
}): Promise<Template> {
  return request<Template>("/templates", {
    method: "POST",
    body: JSON.stringify(tmpl),
  });
}

/**
 * Update a local template.
 *
 * @param id      - Template identifier.
 * @param updates - Partial template fields to merge.
 * @returns The updated {@link Template}.
 */
export function updateTemplate(
  id: string,
  updates: Partial<Template>
): Promise<Template> {
  return request<Template>(`/templates/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

/**
 * Delete a local template.
 *
 * @param id - Template identifier.
 */
export function deleteTemplate(id: string): Promise<null> {
  return request<null>(`/templates/${id}`, { method: "DELETE" });
}

/**
 * List all discovered template categories.
 *
 * @returns An array of category path strings (e.g. "code/frontend").
 */
export function listCategories(): Promise<string[]> {
  return request<string[]>("/templates/categories");
}

// ── Settings ────────────────────────────────────────────────────────────

/**
 * Retrieve the current application settings (API keys are masked).
 *
 * @returns The full {@link Settings} object.
 */
export function getSettings(): Promise<Settings> {
  return request<Settings>("/settings");
}

/**
 * Deep-merge partial settings into the current configuration.
 *
 * @param updates - Partial settings to merge.
 * @returns The resulting full {@link Settings} object.
 */
export function updateSettings(updates: Partial<Settings>): Promise<Settings> {
  return request<Settings>("/settings", {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

/**
 * Test an AI provider configuration by sending a probe message.
 *
 * @param config - Provider configuration to test.
 * @returns `{ connected: true }` on success.
 */
export function testProvider(config: {
  apiKey: string;
  model: string;
  baseUrl: string;
}): Promise<{ connected: boolean }> {
  return request<{ connected: boolean }>("/settings/test-provider", {
    method: "POST",
    body: JSON.stringify(config),
  });
}

// ── Models ──────────────────────────────────────────────────────────────

/**
 * List all Vosk STT models with download/active status.
 *
 * @returns An array of {@link VoskModelInfo} objects.
 */
export function listModels(): Promise<VoskModelInfo[]> {
  return request<VoskModelInfo[]>("/models");
}

/**
 * List available LLM models from a configured provider.
 *
 * @param provider - Provider name (e.g. "openrouter", "openai").
 * @returns An array of model entries with id and name.
 */
export function listProviderModels(
  provider: string
): Promise<{ id: string; name: string }[]> {
  return request<{ id: string; name: string }[]>(
    `/generate/models/${encodeURIComponent(provider)}`
  );
}

/**
 * Activate a downloaded Vosk model for speech-to-text.
 *
 * @param id - Model identifier from the manifest.
 * @returns `{ activeModel: id }` confirmation.
 */
export function activateModel(
  id: string
): Promise<{ activeModel: string }> {
  return request<{ activeModel: string }>(`/models/${id}/activate`, {
    method: "PUT",
  });
}

/**
 * Delete a downloaded Vosk model from disk.
 *
 * @param id - Model identifier.
 */
export function deleteModel(id: string): Promise<null> {
  return request<null>(`/models/${id}`, { method: "DELETE" });
}

/**
 * Download a Vosk model. Streams progress via SSE.
 *
 * @param id         - Model identifier from the manifest.
 * @param onProgress - Called with download progress updates.
 * @returns Promise that resolves when download is complete.
 */
export async function downloadModel(
  id: string,
  onProgress?: (info: { status: string; downloaded: number; total: number; percent: number }) => void
): Promise<void> {
  const res = await fetch(`${BASE}/models/${id}/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok || !res.body) {
    let errorMsg = "Download failed";
    try {
      const body = await res.json();
      errorMsg = body.error || errorMsg;
    } catch {}
    throw new ApiClientError(errorMsg, res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();

      try {
        const parsed = JSON.parse(payload);
        if (parsed.status === "complete") return;
        if (parsed.error) throw new ApiClientError(parsed.error, 500);
        if (onProgress) onProgress(parsed);
      } catch (e) {
        if (e instanceof ApiClientError) throw e;
        // skip malformed chunks
      }
    }
  }
}

/**
 * Check server health.
 *
 * @returns Health payload with status, version, and data directory.
 */
export function healthCheck(): Promise<{
  status: string;
  version: string;
  dataDir: string;
}> {
  return request("/health");
}

// ── Generate (streaming) ────────────────────────────────────────────────

/**
 * Send a prompt to the LLM and receive a streamed response.
 *
 * This function opens an SSE connection and yields text chunks
 * as they arrive.  The caller should iterate with `for await`.
 *
 * @param req - The generate request payload.
 * @yields Individual text chunks from the LLM.
 *
 * @example
 * ```ts
 * for await (const chunk of generateStream({ systemPrompt: "...", messages })) {
 *   appendToUI(chunk);
 * }
 * ```
 */
export async function* generateStream(
  req: GenerateRequest
): AsyncGenerator<string, void, unknown> {
  const res = await fetch(`${BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...req, stream: true }),
  });

  if (!res.ok || !res.body) {
    const body = await res.json();
    throw new ApiClientError(body.error || "Stream failed", res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return;

      try {
        const parsed = JSON.parse(payload);
        if (parsed.content) yield parsed.content;
      } catch {
        // skip malformed chunks
      }
    }
  }
}

/**
 * Send a prompt to the LLM and receive the complete response at once.
 *
 * @param req - The generate request payload.
 * @returns The full assistant response string.
 */
export async function generate(
  req: Omit<GenerateRequest, "stream">
): Promise<string> {
  const data = await request<{ content: string }>("/generate", {
    method: "POST",
    body: JSON.stringify({ ...req, stream: false }),
  });
  return data.content;
}
