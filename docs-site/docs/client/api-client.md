---
sidebar_position: 5
title: API Client
---

# API Client

**File:** `src/api/client.ts` (637 lines)

The API client is a typed HTTP wrapper that handles all communication between the client and the GetThatQuick server. All requests go through the `/api` base URL, which is proxied to `localhost:3000` during development.

---

## Error Handling

### ApiClientError

A custom error class extending `Error`:

```ts
class ApiClientError extends Error {
  status: number;        // HTTP status code (0 for network errors)
  isNetworkError: boolean; // true if the request never reached the server
}
```

The client catches and wraps:
- **Network errors** — server unreachable, DNS failures
- **JSON parse failures** — malformed response bodies
- **Timeouts** — request exceeded time limit
- **Abort signals** — user-cancelled requests

---

## Endpoint Groups

### Sessions

| Method | Endpoint | Description |
|---|---|---|
| `getSessions()` | `GET /api/sessions` | List all sessions |
| `getSession(id)` | `GET /api/sessions/:id` | Get a single session |
| `createSession(data)` | `POST /api/sessions` | Create a new session |
| `updateSession(id, data)` | `PUT /api/sessions/:id` | Update session metadata |
| `deleteSession(id)` | `DELETE /api/sessions/:id` | Delete a session |

### Templates

| Method | Endpoint | Description |
|---|---|---|
| `getTemplates()` | `GET /api/templates` | List all templates |
| `getTemplate(id)` | `GET /api/templates/:id` | Get a single template |
| `createTemplate(data)` | `POST /api/templates` | Create a new template |
| `updateTemplate(id, data)` | `PUT /api/templates/:id` | Update a template |
| `deleteTemplate(id)` | `DELETE /api/templates/:id` | Delete a template |
| `syncCommunity()` | `POST /api/templates/sync` | Sync community templates |
| `getCategories()` | `GET /api/templates/categories` | List template categories |

### Settings

| Method | Endpoint | Description |
|---|---|---|
| `getSettings()` | `GET /api/settings` | Get current settings |
| `updateSettings(data)` | `PUT /api/settings` | Update settings |
| `testProvider(provider, config)` | `POST /api/settings/test` | Test LLM provider connectivity |

### Models

| Method | Endpoint | Description |
|---|---|---|
| `getModels()` | `GET /api/models` | List available models |
| `downloadModel(name)` | `POST /api/models/download` | Download a model (SSE streaming) |
| `activateModel(name)` | `POST /api/models/activate` | Set the active model |
| `deleteModel(name)` | `DELETE /api/models/:name` | Delete a downloaded model |
| `cancelDownload(name)` | `POST /api/models/cancel` | Cancel an in-progress download |

### Generate

| Method | Endpoint | Description |
|---|---|---|
| `generateStream(sessionId, messages, options)` | `POST /api/generate/stream` | Stream LLM response (SSE) |
| `generate(sessionId, messages, options)` | `POST /api/generate` | Single-shot LLM response |

### Health

| Method | Endpoint | Description |
|---|---|---|
| `health()` | `GET /api/health` | Server health check |

---

## Streaming APIs

### generateStream

Returns an `AsyncGenerator<string>` that yields Server-Sent Event (SSE) chunks as they arrive from the LLM.

```ts
async function* generateStream(
  sessionId: string,
  messages: Message[],
  options?: GenerateOptions
): AsyncGenerator<string>
```

**Usage:**
```ts
for await (const chunk of api.generateStream(sessionId, messages)) {
  // Each chunk is a text fragment of the response
  appendToMessage(chunk);
}
```

The generator supports abort via `AbortSignal` passed in options.

### downloadModel

Also uses SSE streaming, but yields structured progress events:

```ts
interface DownloadProgress {
  speed: string;    // e.g. "12.5 MB/s"
  eta: string;      // e.g. "2m 30s"
  progress: number; // 0-100
  status: string;   // "downloading" | "complete" | "error"
}
```

This allows the UI to display a real-time download progress bar with speed and estimated time remaining.
