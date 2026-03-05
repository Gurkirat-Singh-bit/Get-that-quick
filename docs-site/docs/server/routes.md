---
sidebar_position: 2
title: Routes
---

# Routes

All API routes are mounted under `/api/` and defined in `server/src/routes/`. Each file exports a Hono sub-app that the main entry point mounts at the corresponding path.

---

## `generate.ts`

**Mount:** `/api/generate` · ~113 lines

Handles LLM inference requests. Validates the incoming body with Zod schemas.

### Endpoints

#### `POST /`

Forward a prompt to the configured AI provider. The request body is validated via Zod before being passed to the LLM service.

- **Response mode — SSE:** When the client accepts streaming, the response is a `text/event-stream` that emits tokens as they arrive from the model.
- **Response mode — JSON:** When streaming is not requested, the full generated text is returned as a single JSON payload.

```json title="Request Body"
{
  "messages": [{ "role": "user", "content": "..." }],
  "model": "gpt-4o",
  "provider": "openai",
  "stream": true
}
```

#### `GET /models/:provider`

List the models available for a given provider by querying the provider's endpoint.

```json title="Response"
{
  "models": ["gpt-4o", "gpt-4o-mini", "..."]
}
```

---

## `sessions.ts`

**Mount:** `/api/sessions` · ~94 lines

CRUD operations for chat sessions. Each session is stored as a JSON file on disk.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List session metadata (id, title, timestamps) |
| `GET` | `/:id` | Get a single session with full message history |
| `POST` | `/` | Create a new session (assigned `sess_<nanoid12>`) |
| `PUT` | `/:id` | Update a session (title, messages, etc.) |
| `DELETE` | `/:id` | Delete a session |

```json title="POST / — Response"
{
  "id": "sess_a1b2c3d4e5f6",
  "title": "New Session",
  "messages": [],
  "createdAt": "2026-03-05T...",
  "updatedAt": "2026-03-05T..."
}
```

---

## `templates.ts`

**Mount:** `/api/templates` · ~134 lines

Manages prompt templates stored as Markdown files with YAML frontmatter. Templates are organized by category (subdirectories).

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List all templates (local + community) |
| `GET` | `/categories` | List available template categories |
| `GET` | `/:id` | Get a single template |
| `POST` | `/` | Create a new template (assigned `tmpl_<nanoid12>`) |
| `PUT` | `/:id` | Update an existing template |
| `DELETE` | `/:id` | Delete a template |
| `POST` | `/sync` | Sync community templates from the GitHub repository |

```json title="POST / — Request Body"
{
  "title": "My Template",
  "description": "A helpful template",
  "category": "development",
  "tags": ["code", "review"],
  "content": "You are an expert code reviewer..."
}
```

The `/sync` endpoint clones (or pulls) the community template repository from GitHub into `templates/community/`, making shared templates available alongside local ones.

---

## `models.ts`

**Mount:** `/api/models` · ~127 lines

Manages Vosk speech-to-text model lifecycle — listing, downloading, activating, and deleting models.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List all models from the registry with download/active status |
| `POST` | `/:id/download` | Start downloading a model (SSE progress stream) |
| `DELETE` | `/:id/download` | Cancel an in-progress download |
| `DELETE` | `/:id` | Delete a downloaded model from disk |
| `PUT` | `/:id/activate` | Set a model as the active STT model |

#### Download Progress (SSE)

The `POST /:id/download` endpoint responds with Server-Sent Events reporting real-time download progress:

```
data: {"progress": 42, "speed": "2.3 MB/s", "eta": "15s"}
data: {"progress": 100, "status": "extracting"}
data: {"status": "complete"}
```

---

## `settings.ts`

**Mount:** `/api/settings` · ~118 lines

Reads and writes the user's configuration. Sensitive values (API keys) are masked on read and intelligently handled on write.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Get current settings (API keys masked with `••••`) |
| `PUT` | `/` | Update settings via deep merge (masked keys are detected and preserved) |
| `POST` | `/test-provider` | Test connectivity to an LLM provider with the given credentials |

#### Key Masking

When reading settings, any API key value is replaced with a masked string (e.g. `sk-••••••••abcd`). On `PUT`, the server detects whether a value still contains the mask characters. If it does, the incoming value is discarded and the existing unmasked key is preserved — preventing accidental overwrites with masked placeholders.

#### Deep Merge

The `PUT /` endpoint performs a deep merge of the incoming body into the existing settings object. This means clients can send partial updates (e.g. only the `theme` key) without clobbering unrelated settings.

```json title="POST /test-provider — Request Body"
{
  "provider": "openai",
  "apiKey": "sk-...",
  "baseUrl": "https://api.openai.com/v1"
}
```
