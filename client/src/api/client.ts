/**
 * @fileoverview API client for the GetThatQuick server.
 *
 * Provides a typed, centralised HTTP client that handles all REST
 * communication with the backend.  Every endpoint returns the unwrapped
 * `data` payload or throws an {@link ApiClientError} on failure.
 *
 * @module api/client
 * @license CC BY-NC 4.0 — {@link https://creativecommons.org/licenses/by-nc/4.0/}
 * @author Gurkirat Singh
 * @created 2026-02-25
 * @updated 2026-03-03
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
 * Custom error thrown when the API responds with `{ ok: false }` or network fails.
 *
 * @extends Error
 */
export class ApiClientError extends Error {
  /** HTTP status code from the response. */
  status: number;
  /** Whether this is a network/connectivity error. */
  isNetworkError: boolean;

  /**
   * @param message - Human-readable error description from the API.
   * @param status  - HTTP status code (0 for network errors).
   * @param isNetworkError - Whether this is a network/connectivity issue.
   */
  constructor(message: string, status: number, isNetworkError = false) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

/**
 * Internal helper – sends a request and unwraps the JSON envelope.
 * Handles network errors, timeouts, and server failures gracefully.
 *
 * @template T  The expected shape of `data` inside `ApiResponse<T>`.
 * @param path    - Relative path appended to {@link BASE} (e.g. `/sessions`).
 * @param options - Standard `RequestInit` overrides.
 * @returns The unwrapped `data` value from the API.
 * @throws {ApiClientError} If the response is not ok or network fails.
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });

    // Handle non-JSON responses (server errors, etc.)
    let body: ApiResponse<T> | ApiError;
    try {
      body = (await res.json()) as ApiResponse<T> | ApiError;
    } catch (jsonErr) {
      // Server returned non-JSON (probably 500 error or similar)
      throw new ApiClientError(
        res.ok 
          ? "Invalid response from server" 
          : `Server error: ${res.status} ${res.statusText}`,
        res.status
      );
    }

    if (!body.ok) {
      throw new ApiClientError((body as ApiError).error, res.status);
    }

    return (body as ApiResponse<T>).data;
  } catch (err) {
    // Network errors (offline, DNS failure, connection refused, etc.)
    if (err instanceof TypeError) {
      throw new ApiClientError(
        "Network error: Please check your internet connection and ensure the server is running",
        0,
        true
      );
    }
    
    // Timeout errors
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiClientError(
        "Request timeout: The server took too long to respond",
        0,
        true
      );
    }

    // Re-throw ApiClientError as-is
    if (err instanceof ApiClientError) {
      throw err;
    }

    // Unknown errors
    throw new ApiClientError(
      err instanceof Error ? err.message : "Unknown error occurred",
      0
    );
  }
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
 * Sync community templates from a GitHub repo.
 *
 * @param repoUrl - Optional custom repo URL.
 * @returns Sync result with count of templates.
 */
export function syncCommunityTemplates(
  repoUrl?: string
): Promise<{ added: number; total: number }> {
  return request<{ added: number; total: number }>("/templates/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(repoUrl ? { repoUrl } : {}),
  });
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
 * Download progress information with speed and time estimation.
 */
export interface ModelDownloadProgress {
  /** Current status: downloading, extracting, or complete. */
  status: "downloading" | "extracting" | "complete";
  /** Bytes downloaded so far. */
  downloaded: number;
  /** Total file size in bytes. */
  total: number;
  /** Download percentage (0-100). */
  percent: number;
  /** Download speed in bytes per second (only during downloading). */
  speed?: number;
  /** Estimated time remaining in seconds (only during downloading). */
  eta?: number;
}

/**
 * Download a Vosk model with progress streaming via SSE.
 * Progress includes download speed and estimated time remaining.
 *
 * @param id         - Model identifier from the manifest.
 * @param onProgress - Called with download progress updates including speed and ETA.
 * @returns Promise that resolves when download is complete.
 * 
 * @example
 * ```ts
 * await downloadModel("vosk-model-small-en-us-0.15", (progress) => {
 *   if (progress.status === "downloading") {
 *     const speedMB = (progress.speed! / 1024 / 1024).toFixed(1);
 *     console.log(\`\${progress.percent}% at \${speedMB} MB/s (ETA: \${progress.eta}s)\`);
 *   } else if (progress.status === "extracting") {
 *     console.log("Extracting...");
 *   }
 * });
 * ```
 */
export async function downloadModel(
  id: string,
  onProgress?: (info: ModelDownloadProgress) => void
): Promise<void> {
  try {
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

    try {
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
            const parsed = JSON.parse(payload) as ModelDownloadProgress;
            if (parsed.status === "complete") return;
            if ("error" in parsed) throw new ApiClientError((parsed as any).error, 500);
            if (onProgress) onProgress(parsed);
          } catch (e) {
            if (e instanceof ApiClientError) throw e;
            // skip malformed chunks
          }
        }
      }
    } catch (readErr) {
      // Network error during streaming
      if (readErr instanceof TypeError) {
        throw new ApiClientError(
          "Network error during download: Connection lost. Please check your internet connection.",
          0,
          true
        );
      }
      throw readErr;
    }
  } catch (err) {
    // Network error on initial request
    if (err instanceof TypeError) {
      throw new ApiClientError(
        "Network error: Cannot connect to server. Please check your internet connection.",
        0,
        true
      );
    }
    throw err;
  }
}

/**
 * Cancel an active model download.
 *
 * @param id - Model identifier to cancel.
 * @returns True if download was cancelled, false if no active download.
 * 
 * @example
 * ```ts
 * if (await cancelDownload("vosk-model-small-en-us-0.15")) {
 *   console.log("Download cancelled");
 * }
 * ```
 */
export async function cancelDownload(id: string): Promise<boolean> {
  try {
    await request<{ cancelled: boolean }>(`/models/${id}/download`, { 
      method: "DELETE" 
    });
    return true;
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) {
      return false;
    }
    throw err;
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

// ── Cloud STT ───────────────────────────────────────────────────────────

/**
 * Transcribe an audio blob via the server's cloud STT endpoint.
 * The server forwards to Groq or OpenAI Whisper using the stored API key.
 *
 * @param audioBlob - The recorded audio blob (webm, ogg, wav, etc.)
 * @returns The transcribed text string.
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const form = new FormData();
  form.append("audio", audioBlob, "recording.webm");

  const res = await fetch(`${BASE}/stt/transcribe`, {
    method: "POST",
    body: form,
  });

  let body: ApiResponse<{ text: string }> | ApiError;
  try {
    body = await res.json() as ApiResponse<{ text: string }> | ApiError;
  } catch {
    throw new ApiClientError(`Server error: ${res.status}`, res.status);
  }

  if (!body.ok) {
    throw new ApiClientError((body as ApiError).error, res.status);
  }

  return (body as ApiResponse<{ text: string }>).data.text;
}

// ── GitHub Copilot Auth ──────────────────────────────────────────────────

export interface CopilotDeviceFlow {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  interval: number;
  expiresIn: number;
}

export interface CopilotPollResult {
  ok: boolean;
  pending?: boolean;
  slowDown?: boolean;
  error?: string;
  providerName?: string;
}

/**
 * Start the GitHub Copilot OAuth device flow.
 * Returns the user_code the user needs to enter at github.com/login/device.
 */
export async function startCopilotAuth(): Promise<CopilotDeviceFlow> {
  return request<CopilotDeviceFlow>("/auth/copilot/start", { method: "POST" });
}

/**
 * Poll GitHub to check if the user has authorized.
 * Call this repeatedly until `ok: true` or a non-pending error.
 * Uses raw fetch because the server returns ok:false for pending (not an error).
 */
export async function pollCopilotAuth(deviceCode: string, providerName?: string): Promise<CopilotPollResult> {
  try {
    const res = await fetch(`${BASE}/auth/copilot/poll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceCode, providerName }),
    });
    const body = await res.json() as {
      ok: boolean;
      pending?: boolean;
      slowDown?: boolean;
      error?: string;
      data?: { connected: boolean; providerName: string };
    };

    if (body.ok && body.data) {
      return { ok: true, providerName: body.data.providerName };
    }
    if (body.pending) {
      return { ok: false, pending: true, slowDown: body.slowDown };
    }
    return { ok: false, error: body.error || "Unknown error" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Get the current GitHub Copilot connection status.
 */
export function getCopilotStatus(): Promise<{ connected: boolean; providerName?: string; model?: string }> {
  return request<{ connected: boolean; providerName?: string; model?: string }>("/auth/copilot/status");
}

/**
 * Disconnect GitHub Copilot by removing the stored token.
 */
export function disconnectCopilot(): Promise<{ disconnected: boolean }> {
  return request<{ disconnected: boolean }>("/auth/copilot/disconnect", { method: "POST" });
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
 * @throws {ApiClientError} On network failure or server error.
 *
 * @example
 * ```ts
 * try {
 *   for await (const chunk of generateStream({ systemPrompt: "...", messages })) {
 *     appendToUI(chunk);
 *   }
 * } catch (err) {
 *   if (err instanceof ApiClientError && err.isNetworkError) {
 *     showNetworkError();
 *   }
 * }
 * ```
 */
export async function* generateStream(
  req: GenerateRequest,
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  let res: Response;
  
  try {
    res = await fetch(`${BASE}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...req, stream: true }),
      signal,
    });
  } catch (err) {
    // Abort is intentional — stop cleanly without an error
    if (err instanceof DOMException && err.name === "AbortError") return;
    // Network error on initial request
    if (err instanceof TypeError) {
      throw new ApiClientError(
        "Network error: Cannot connect to server. Please check your internet connection.",
        0,
        true
      );
    }
    throw err;
  }

  if (!res.ok || !res.body) {
    let errorMsg = "Stream failed";
    try {
      const body = await res.json();
      errorMsg = body.error || errorMsg;
    } catch {}
    throw new ApiClientError(errorMsg, res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
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
          if (parsed.error) {
            throw new ApiClientError(parsed.error, 500);
          }
          if (parsed.content) yield parsed.content;
        } catch (e) {
          if (e instanceof ApiClientError) throw e;
          // skip malformed chunks
        }
      }
    }
  } catch (readErr) {
    // Abort is intentional — stop cleanly without an error
    if (readErr instanceof DOMException && (readErr as DOMException).name === "AbortError") return;
    // Network error during streaming
    if (readErr instanceof TypeError || readErr instanceof DOMException) {
      throw new ApiClientError(
        "Network error during generation: Connection lost. Response may be incomplete.",
        0,
        true
      );
    }
    throw readErr;
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
