# Checklist — GetThatQuick

> Implementation checklist. `[MVP]` = first release. `[P2]`/`[P3]` = later phases.

---

## Phase Overview

| Phase | Scope                                                    | Status |
| ----- | -------------------------------------------------------- | ------ |
| MVP   | STT, chat sessions, templates, LLM generation            | 🔲     |
| P2    | Community templates, import/export, backup               | 🔲     |
| P3    | Cloud sync, speaker ID, advanced UX                      | 🔲     |

---

## Pages (3 total)

| Route      | Page           | Description                                          |
| ---------- | -------------- | ---------------------------------------------------- |
| `/`        | Chat           | Main ChatGPT-like view: sidebar + chat area          |
| `/setup`   | Onboarding     | First-time wizard: model → AI config → theme         |
| `/settings`| Settings       | AI providers, Vosk models, theme, data management    |

---

## 1. Project Setup & Infrastructure

- [ ] `[MVP]` Initialize monorepo structure (`client/`, `server/`, `shared/`, `docs/`)
- [ ] `[MVP]` Set up `server/` — Bun + Hono + TypeScript
- [ ] `[MVP]` Set up `shared/` — shared type definitions
- [ ] `[MVP]` Set up `client/` — Vite + React + TypeScript + Tailwind + ShadCN/ui
- [ ] `[MVP]` Configure ESLint + Prettier
- [ ] `[MVP]` Create `Dockerfile` (multi-stage, multi-arch: detect `TARGETARCH`, pull correct libvosk)
- [ ] `[MVP]` Create `docker-compose.yml` (port 3000, bind mount `~/.getthatquick:/data`)
- [ ] `[MVP]` Create `.dockerignore`, `.gitignore`
- [ ] `[MVP]` Verify Docker build + run end-to-end

---

## 2. Backend — Server Setup

- [ ] `[MVP]` `server/src/index.ts` — Hono app entry point
  - [ ] `[MVP]` Serve built React SPA (static files from `client/dist/`)
  - [ ] `[MVP]` Mount API routes under `/api/`
  - [ ] `[MVP]` Mount WebSocket handler at `/ws/stt`
  - [ ] `[MVP]` SPA fallback (serve `index.html` for non-API/non-WS routes)
  - [ ] `[MVP]` Initialize data directories on first start (`prompts/`, `templates/local/`, `templates/community/`, `models/`, `config/`)
  - [ ] `[MVP]` Load or create default `settings.json`

---

## 3. Backend — Data Path Resolution

- [ ] `[MVP]` `server/src/lib/paths.ts` — cross-platform data directory
  - [ ] `[MVP]` Check `DATA_DIR` env var first (for Docker: `/data`)
  - [ ] `[MVP]` Fallback to `~/.getthatquick/` (macOS/Linux: `$HOME`, Windows: `%USERPROFILE%`)
  - [ ] `[MVP]` Auto-create directory structure if it doesn't exist

---

## 4. Backend — Vosk FFI Module

- [ ] `[MVP]` `server/src/lib/ffi.ts` — Vosk C API declarations via `bun:ffi`
  - [ ] `[MVP]` `vosk_set_log_level`
  - [ ] `[MVP]` `vosk_model_new` / `vosk_model_free`
  - [ ] `[MVP]` `vosk_recognizer_new` / `vosk_recognizer_free`
  - [ ] `[MVP]` `vosk_recognizer_set_words`
  - [ ] `[MVP]` `vosk_recognizer_accept_waveform`
  - [ ] `[MVP]` `vosk_recognizer_result` / `vosk_recognizer_partial_result` / `vosk_recognizer_final_result`
- [ ] `[MVP]` `server/src/services/vosk.ts` — Higher-level Vosk service
  - [ ] `[MVP]` Load model (session-scoped, cached in memory)
  - [ ] `[MVP]` Create recognizer per dictation session
  - [ ] `[MVP]` Process audio chunks → return partial/final JSON
  - [ ] `[MVP]` Free recognizer on session end (keep model cached)
  - [ ] `[MVP]` Model switch: reload model pointer only if active model changed
  - [ ] `[MVP]` No-model state: return clear error if no model downloaded
  - [ ] `[MVP]` Error handling: model not found, corrupt model, FFI failures

> **Reference**: PoC at `test/javascript/live_transcribe.ts`

---

## 5. Backend — WebSocket STT Handler

- [ ] `[MVP]` `server/src/ws/stt.ts`
  - [ ] `[MVP]` Accept WebSocket upgrade at `/ws/stt`
  - [ ] `[MVP]` On connect: check model exists, create recognizer
  - [ ] `[MVP]` On binary message: feed to `vosk_recognizer_accept_waveform`
  - [ ] `[MVP]` Send `{ type: "partial", text }` for partials
  - [ ] `[MVP]` Send `{ type: "final", text }` for finals
  - [ ] `[MVP]` On close: call `vosk_recognizer_final_result`, free recognizer
  - [ ] `[MVP]` Reject with error if no model downloaded
  - [ ] `[MVP]` Timeout: auto-close idle sessions

---

## 6. Backend — REST API Routes

### 6.1 Sessions — `/api/sessions`
- [ ] `[MVP]` `GET /api/sessions` — list all sessions (metadata: id, title, templateId, updatedAt)
- [ ] `[MVP]` `GET /api/sessions/:id` — get full session with messages
- [ ] `[MVP]` `POST /api/sessions` — create new session
- [ ] `[MVP]` `PUT /api/sessions/:id` — update session (add messages, rename, etc.)
- [ ] `[MVP]` `DELETE /api/sessions/:id` — delete session
- [ ] `[MVP]` `server/src/services/sessions.ts` — JSON file I/O for `prompts/*.json`

### 6.2 Templates — `/api/templates`
- [ ] `[MVP]` `GET /api/templates` — list all templates (local + community)
- [ ] `[MVP]` `GET /api/templates/:id` — get single template (frontmatter + body)
- [ ] `[MVP]` `POST /api/templates` — create local template
- [ ] `[MVP]` `PUT /api/templates/:id` — update local template
- [ ] `[MVP]` `DELETE /api/templates/:id` — delete local template
- [ ] `[MVP]` `server/src/services/templates.ts` — `.md` file I/O with YAML frontmatter
- [ ] `[MVP]` Seed default templates on first launch (if `templates/local/` is empty)

### 6.3 Generate — `/api/generate`
- [ ] `[MVP]` `POST /api/generate` — stateless LLM proxy
  - [ ] `[MVP]` Accept `{ systemPrompt, messages[], stream? }`
  - [ ] `[MVP]` Forward to configured LLM provider via `openai` SDK
  - [ ] `[MVP]` Stream response back as SSE
- [ ] `[MVP]` `server/src/services/llm.ts` — LLM client
  - [ ] `[MVP]` Init OpenAI-compatible client from settings
  - [ ] `[MVP]` Support streaming responses
  - [ ] `[MVP]` Error handling: invalid key, rate limit, provider down

### 6.4 Models — `/api/models`
- [ ] `[MVP]` `GET /api/models` — list models (manifest + which are downloaded)
- [ ] `[MVP]` `POST /api/models/:id/download` — download & extract to `/data/models/`
  - [ ] `[MVP]` Stream download progress via SSE
  - [ ] `[MVP]` Extract zip, verify structure
- [ ] `[MVP]` `DELETE /api/models/:id` — remove model from disk
- [ ] `[MVP]` `PUT /api/models/:id/activate` — set as active model
- [ ] `[MVP]` `server/src/services/models.ts` — download, extraction, management

### 6.5 Settings — `/api/settings`
- [ ] `[MVP]` `GET /api/settings` — return settings (mask API keys)
- [ ] `[MVP]` `PUT /api/settings` — validate with Zod, write to disk
- [ ] `[MVP]` `POST /api/settings/test-provider` — test LLM provider connection
- [ ] `[MVP]` `server/src/services/config.ts` — read/write `settings.json`

---

## 7. Backend — Models Manifest

- [ ] `[MVP]` `server/models.json` — bundled manifest
  - [ ] `[MVP]` Include: small-en-us, large-en-us
  - [ ] `[MVP]` Fields: `id`, `name`, `language`, `size`, `accuracy`, `minRAM`, `url`, `default`
- [ ] `[P2]` Add more language models

---

## 8. Shared Types

- [ ] `[MVP]` `shared/types.ts`
  - [ ] `[MVP]` `Session` — id, title, templateId, messages[], createdAt, updatedAt
  - [ ] `[MVP]` `Message` — id, role (user|assistant), content, source? (voice|text), timestamp
  - [ ] `[MVP]` `Template` — id, title, description, category, tags, content, source (local|community)
  - [ ] `[MVP]` `VoskModel` — id, name, language, size, accuracy, minRAM, url, downloaded, active
  - [ ] `[MVP]` `Settings` — ai, stt, general, onboarding
  - [ ] `[MVP]` `AIProvider` — name, apiKey, model, baseUrl
  - [ ] `[MVP]` `TranscriptEvent` — type (partial|final), text
  - [ ] `[MVP]` `GenerateRequest` / `GenerateResponse`

---

## 9. Backend — Seed Templates

- [ ] `[MVP]` Bundle 5 default templates in `server/seed/`:
  - [ ] `[MVP]` Code Review Request
  - [ ] `[MVP]` Bug Report
  - [ ] `[MVP]` Meeting Summary / Action Items
  - [ ] `[MVP]` General Prompt Polish
  - [ ] `[MVP]` Email Draft
- [ ] `[MVP]` Copy to `/data/templates/local/` on first launch if directory is empty

---

## 10. Docker & Deployment

- [ ] `[MVP]` `Dockerfile` — multi-stage, multi-arch
  - [ ] `[MVP]` Detect `TARGETARCH`, pull correct libvosk
  - [ ] `[MVP]` Test: `docker buildx build --platform linux/amd64,linux/arm64`
- [ ] `[MVP]` `docker-compose.yml` — `~/.getthatquick:/data`
- [ ] `[MVP]` Test full flow in container
- [ ] `[MVP]` Verify data persists across container restarts
- [ ] `[MVP]` Test on Linux (x86_64)
- [ ] `[MVP]` Test on Linux (aarch64)
- [ ] `[MVP]` Test on macOS (Docker Desktop, Apple Silicon)
- [ ] `[P2]` Test on Windows (Docker Desktop / WSL2)

---

## 11. Dev Experience

- [ ] `[MVP]` Dev mode: server (Bun --watch) without Docker
- [ ] `[MVP]` Dev mode: client (Vite dev server) with proxy to backend
- [ ] `[MVP]` `README.md` — setup instructions (dev + Docker)

---

## 12. Frontend — Chat Page (user designing)

- [ ] `[MVP]` ChatGPT-like layout: sidebar + chat area
- [ ] `[MVP]` Sidebar: session list, new session, templates browser, settings link
- [ ] `[MVP]` Chat area: messages, dictate button, text input, send
- [ ] `[MVP]` Audio: WebSocket streaming, partial/final display
- [ ] `[MVP]` Template selector on new session
- [ ] `[MVP]` Auto-save sessions
- [ ] `[MVP]` No-model state UI

---

## 13. Frontend — Onboarding Page

- [ ] `[MVP]` Step 1: Download Vosk model (with progress)
- [ ] `[MVP]` Step 2: Configure AI provider (API key, model)
- [ ] `[MVP]` Step 3: Pick theme
- [ ] `[MVP]` Mark onboarding complete in settings

---

## 14. Frontend — Settings Page

- [ ] `[MVP]` AI provider config (OpenRouter, OpenAI, Custom)
- [ ] `[MVP]` Vosk model management (download, switch, delete)
- [ ] `[MVP]` Theme toggle
- [ ] `[MVP]` Test provider connection

---

## P2 — Community Templates & Import/Export

- [ ] `[P2]` Community templates from remote Git repository
- [ ] `[P2]` Version comparison, one-click update (Nuclei-style)
- [ ] `[P2]` Community templates are read-only; duplicate to local to edit
- [ ] `[P2]` Import/export prompts (.md/.json)
- [ ] `[P2]` Backup: export `/data/` as archive

---

## P3 — Cloud Sync & Advanced

- [ ] `[P3]` Google Drive sync
- [ ] `[P3]` OneDrive sync
- [ ] `[P3]` Speaker identification
- [ ] `[P3]` Voice Activity Detection
- [ ] `[P3]` Command palette (`cmdk`)
- [ ] `[P3]` Keyboard shortcuts
- [ ] `[P3]` Multi-language Vosk models
- [ ] `[P3]` Session history / versioning
