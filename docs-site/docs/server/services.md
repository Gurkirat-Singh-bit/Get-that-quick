---
sidebar_position: 3
title: Services
---

# Services

The service layer (`server/src/services/`) contains all business logic, separated from route handlers. Each service owns a specific domain and manages its own data access.

---

## `config.ts` — Settings Service

~109 lines

Manages reading and writing the user's settings file at `~/.getthatquick/config/settings.json`. Uses an **in-memory cache** so repeated reads don't hit the filesystem.

### Exports

| Function | Description |
|----------|-------------|
| `getSettings()` | Returns the current settings, reading from cache or disk |
| `saveSettings(settings)` | Writes the full settings object to disk and updates the cache |
| `updateSettings(partial)` | Deep-merges a partial settings object into the existing settings, then saves |
| `invalidateCache()` | Clears the in-memory cache, forcing the next read from disk |

The settings file stores the user's LLM provider configuration (provider name, API key, base URL, model), STT model preference, UI theme, system prompt, and onboarding completion status.

---

## `llm.ts` — LLM Service

~283 lines

Wraps the **OpenAI SDK** to provide a provider-agnostic interface for text generation. Works with any OpenAI-compatible API endpoint (OpenAI, Ollama, OpenRouter, LM Studio, etc.).

### Exports

| Function | Description |
|----------|-------------|
| `generateStream(messages, options)` | Returns an `AsyncGenerator<string>` that yields tokens as they arrive |
| `generate(messages, options)` | Awaits the full response and returns the complete text |
| `testProvider(config)` | Sends a lightweight request to verify provider credentials and connectivity |
| `listProviderModels(config)` | Queries the provider's `/models` endpoint and returns available model IDs |

### Extended Thinking

Some models (e.g. certain Claude or DeepSeek variants) return reasoning/thinking content alongside the response. The service handles this by wrapping reasoning tokens in `<think>...</think>` tags within the streamed output, allowing the client to display or hide the model's chain-of-thought.

### Provider-Specific Behaviour

- **OpenRouter** — automatically receives additional HTTP headers required by the OpenRouter API (e.g. `HTTP-Referer`, `X-Title`).
- All other providers — standard OpenAI SDK request format.

---

## `models.ts` — Model Service

~314 lines

Handles the full lifecycle of **Vosk STT models**: listing, downloading, extracting, and deleting.

### Exports

| Function | Description |
|----------|-------------|
| `listModels()` | Returns all models from the static registry with their download and active status |
| `isModelDownloaded(id)` | Checks whether a model exists on disk |
| `getModelPath(id)` | Resolves the absolute filesystem path for a model |
| `downloadModel(id, onProgress)` | Downloads and extracts a model; reports progress with speed and ETA |
| `cancelDownload(id)` | Aborts an in-progress download via its `AbortController` |
| `deleteModel(id)` | Removes a downloaded model from disk |

### Download Tracking

Active downloads are tracked in a `Map<string, AbortController>`. When a download is started, an `AbortController` is stored; calling `cancelDownload()` aborts the fetch and cleans up partial files. Progress callbacks receive `{ progress, speed, eta }` objects.

### Extraction

After a model archive finishes downloading, it is extracted using a **`unzip` subprocess** (`Bun.spawn`). The resulting directory is placed in `~/.getthatquick/models/`.

---

## `sessions.ts` — Sessions Service

~131 lines

Provides file-based CRUD for chat sessions. Each session is a single JSON file at `~/.getthatquick/prompts/<id>.json`.

### Exports

| Function | Description |
|----------|-------------|
| `listSessions()` | Reads all session files and returns an array of session metadata |
| `getSession(id)` | Reads and parses a single session file |
| `createSession(data)` | Writes a new session file with a generated `sess_` prefixed ID |
| `updateSession(id, data)` | Overwrites an existing session file |
| `deleteSession(id)` | Removes the session file from disk |

Session files contain the session ID, title, full message history (role + content pairs), and creation/update timestamps.

---

## `templates.ts` — Templates Service

~374 lines

Manages prompt templates stored as **Markdown files with YAML frontmatter** (parsed via `gray-matter`). Templates are organized into categories represented by subdirectories.

### Exports

| Function | Description |
|----------|-------------|
| `listTemplates()` | Scans both `local/` and `community/` directories, returns all templates |
| `getTemplate(id)` | Finds and parses a single template by ID |
| `createTemplate(data)` | Writes a new template file with a `tmpl_` prefixed ID |
| `updateTemplate(id, data)` | Re-serializes and overwrites an existing template |
| `deleteTemplate(id)` | Removes the template file from disk |
| `listCategories()` | Returns the list of category names derived from subdirectory names |
| `syncCommunityTemplates()` | Clones or pulls the community template repository from GitHub via `git clone` |

### Storage Format

Each template is a `.md` file where:

- **YAML frontmatter** holds metadata: `id`, `title`, `description`, `category`, `tags`, `createdAt`, `updatedAt`.
- **Markdown body** is the template content (i.e. the system prompt sent to the LLM).

Categories map to subdirectories under `templates/local/` and `templates/community/`.

---

## `vosk.ts` — Vosk STT Service

~205 lines

Provides a high-level speech-to-text API on top of the low-level FFI bindings in `lib/ffi.ts`. Manages a **cached singleton model** — only one Vosk model is loaded into memory at a time.

### Exports

| Function | Description |
|----------|-------------|
| `loadModel(path)` | Loads a Vosk model from the given path (frees any previously loaded model) |
| `createRecognizer(sampleRate)` | Creates a new recognizer instance from the loaded model |
| `acceptWaveform(recognizer, data)` | Feeds PCM audio data to a recognizer |
| `getResult(recognizer)` | Returns the latest recognized text segment |
| `getPartialResult(recognizer)` | Returns the in-progress partial transcript |
| `getFinalResult(recognizer)` | Flushes remaining audio and returns the final text |
| `freeRecognizer(recognizer)` | Releases recognizer memory |
| `isModelLoaded()` | Checks whether a model is currently loaded |

### Session-Scoped Recognizers

Each WebSocket connection creates its own recognizer via `createRecognizer()`. The recognizer is freed when the connection closes. This allows multiple concurrent STT sessions to share the same underlying model without interference.
