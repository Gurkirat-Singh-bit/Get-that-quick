---
sidebar_position: 1
title: Server Overview
---

# Server Overview

The GetThatQuick server is a **Bun**-powered backend using the **Hono** web framework. It exposes a REST API for session, template, settings, and model management, a generation endpoint for LLM inference, and a WebSocket endpoint for real-time speech-to-text. All persistent data lives on the filesystem at `~/.getthatquick/` (overridable via `DATA_DIR` in Docker).

## Directory Structure

```
server/
├── models.json                # Static registry of available Vosk STT models
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript configuration
├── seed/                      # Default templates copied on first run
│   ├── bug-report.md
│   ├── code-review.md
│   ├── email-draft.md
│   ├── meeting-summary.md
│   └── prompt-polish.md
└── src/
    ├── index.ts               # Application entry point (bootstrap + server)
    ├── lib/
    │   ├── constants.ts       # Shared constants & default settings
    │   ├── errors.ts          # ApiError class & error-handling utilities
    │   ├── ffi.ts             # Vosk C library FFI bindings (bun:ffi)
    │   └── paths.ts           # Filesystem path derivation & directory init
    ├── routes/
    │   ├── generate.ts        # POST /api/generate, GET /api/generate/models/:provider
    │   ├── models.ts          # Vosk model CRUD + download management
    │   ├── sessions.ts        # Chat session CRUD
    │   ├── settings.ts        # User settings read/write + provider test
    │   └── templates.ts       # Template CRUD + community sync
    ├── services/
    │   ├── config.ts          # Settings persistence with in-memory cache
    │   ├── llm.ts             # OpenAI SDK wrapper (stream + batch)
    │   ├── models.ts          # Vosk model download/extraction lifecycle
    │   ├── sessions.ts        # File-based session storage
    │   ├── templates.ts       # Markdown+YAML template storage
    │   └── vosk.ts            # High-level Vosk STT API over FFI
    └── ws/
        └── stt.ts             # WebSocket handler for real-time STT
```

## Entry Point — `src/index.ts`

The main entry file (~191 lines) orchestrates the full bootstrap sequence:

1. **`ensureDataDirs()`** — creates the directory tree under `~/.getthatquick/` if it doesn't already exist (`prompts/`, `templates/local/`, `templates/community/`, `models/`, `config/`).
2. **Load or create settings** — reads `settings.json` from disk; if missing, writes `DEFAULT_SETTINGS` from `constants.ts`.
3. **Seed templates** — calls `seedTemplates()` to copy the built-in `.md` files from `server/seed/` into `templates/local/` when the directory is empty.
4. **Configure Hono** — initialises the Hono app with CORS and logger middleware.
5. **Mount routes** — registers all API route groups.
6. **`Bun.serve()`** — starts the HTTP server with integrated WebSocket support.

### `seedTemplates()`

On first run (or whenever `templates/local/` is empty), the server copies every `.md` file from `server/seed/` into the local templates directory. This gives new users a handful of useful prompt templates out of the box without requiring any manual setup.

## API Routes

| Mount Point | Route File | Purpose |
|---|---|---|
| `/api/sessions` | `routes/sessions.ts` | Chat session CRUD |
| `/api/templates` | `routes/templates.ts` | Template CRUD + community sync |
| `/api/generate` | `routes/generate.ts` | LLM generation (SSE / JSON) |
| `/api/models` | `routes/models.ts` | Vosk model management |
| `/api/settings` | `routes/settings.ts` | User settings |
| `/api/health` | *(inline)* | Health-check endpoint |

## Static File Serving

The server also serves the pre-built client application:

- **`/assets/*`** and **`/fonts/*`** — mapped to `client/dist/` static assets.
- **SPA fallback** — all non-API, non-static routes return `index.html` so client-side routing works correctly.

## WebSocket

WebSocket upgrades are handled at **`/ws/stt`** for real-time speech-to-text. Incoming binary PCM audio frames are fed to a Vosk recognizer and partial/final transcripts are sent back as JSON events. See the [WebSocket STT](./websocket.md) page for details.

## Dependencies

Key runtime dependencies from `package.json`:

| Package | Purpose |
|---|---|
| `hono` | Fast, lightweight web framework |
| `openai` | OpenAI SDK (works with any compatible endpoint) |
| `zod` | Schema validation for request bodies |
| `gray-matter` | YAML frontmatter parsing for templates |
| `nanoid` | Short unique ID generation |

### Scripts

```json
{
  "dev": "bun --watch src/index.ts",
  "start": "bun src/index.ts"
}
```

- **`dev`** — runs with `--watch` for automatic restarts during development.
- **`start`** — production entry point.
