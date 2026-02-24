# Architecture — GetThatQuick

> Self-hosted prompt workbench. Single Docker container. ChatGPT-like UI. Everything local.

---

## System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HOST MACHINE (macOS/Linux/Win)                  │
│                                                                         │
│   ~/.getthatquick/            ◄────── bind mount ──────►  /data         │
│   ├── prompts/                       (sessions, generated prompts)      │
│   ├── templates/                                                        │
│   │   ├── local/                     (user-created)                     │
│   │   └── community/                 (remote repo, P2)                  │
│   ├── models/                        (downloaded Vosk models)           │
│   └── config/                        (settings.json)                    │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     DOCKER CONTAINER (single)                     │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │                    Bun Runtime (server)                     │  │  │
│  │  │                                                             │  │  │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐   │  │  │
│  │  │  │  Static File  │  │  REST API    │  │  WebSocket     │   │  │  │
│  │  │  │  Server       │  │  (Sessions,  │  │  (Audio Stream │   │  │  │
│  │  │  │  (React SPA)  │  │   Templates, │  │   ↕ STT)       │   │  │  │
│  │  │  │              │  │   Config,     │  │               │   │  │  │
│  │  │  │              │  │   AI Proxy)   │  │               │   │  │  │
│  │  │  └──────────────┘  └──────┬───────┘  └───────┬───────┘   │  │  │
│  │  │                           │                   │           │  │  │
│  │  │                    ┌──────┴───────┐    ┌──────┴───────┐   │  │  │
│  │  │                    │  Filesystem  │    │  Vosk FFI    │   │  │  │
│  │  │                    │  (/data)     │    │  (libvosk.so)│   │  │  │
│  │  │                    └──────────────┘    └──────────────┘   │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                   │  │
│  │  Port 3000 ◄─────────────────────────────────────────────────────│  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌──────────────┐                                                       │
│  │   Browser     │──── http://localhost:3000 ──────────────────►        │
│  │  (ChatGPT-    │                                                      │
│  │   like UI)    │── WebSocket ws://localhost:3000/ws/stt ───►         │
│  │   Mic Input   │                                                      │
│  └──────────────┘                                                       │
│                                                                         │
│                    ┌──────────────────────────┐                          │
│                    │  LLM Provider (external) │                          │
│                    │  OpenRouter / OpenAI /    │                          │
│                    │  Ollama / Custom          │                          │
│                    └──────────────────────────┘                          │
│                        ▲                                                │
│                        │ HTTPS (proxied through Bun server)             │
│                        └────────────────────────────────────            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## UI Model — ChatGPT-Like Layout

The UI is a **single-page ChatGPT-style interface**, not a multi-page app.

```
┌──────────────────────────────────────────────────────────────────┐
│  ┌──────────────┐  ┌──────────────────────────────────────────┐  │
│  │   SIDEBAR     │  │              CHAT AREA                   │  │
│  │              │  │                                          │  │
│  │  [+ New]     │  │  ┌──────────────────────────────────┐   │  │
│  │              │  │  │  Template: Code Review Request    │   │  │
│  │  Sessions:   │  │  └──────────────────────────────────┘   │  │
│  │  ├─ Auth Fix │  │                                          │  │
│  │  ├─ DB Plan  │  │  ┌────────────────────┐                 │  │
│  │  └─ API Docs │  │  │ 🎤 (transcript)    │  ← user spoke  │  │
│  │              │  │  └────────────────────┘                 │  │
│  │  ──────────  │  │                                          │  │
│  │              │  │  ┌────────────────────┐                 │  │
│  │  Templates ► │  │  │ (LLM response)     │  ← generated   │  │
│  │              │  │  │ polished prompt     │                │  │
│  │  ──────────  │  │  └────────────────────┘                 │  │
│  │              │  │                                          │  │
│  │  ⚙ Settings │  │  ┌──────────────────────────────────┐   │  │
│  │              │  │  │  [🎤 Dictate]  [Type...]  [Send] │   │  │
│  └──────────────┘  │  └──────────────────────────────────┘   │  │
│                     └──────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Pages (3 total)

| Route      | Page        | Purpose                                                       |
| ---------- | ----------- | ------------------------------------------------------------- |
| `/`        | **Chat**    | Main view. Sidebar (sessions, templates, settings) + chat area. This IS the app. |
| `/setup`   | **Onboarding** | First-time wizard. Download Vosk model → configure AI provider → pick theme. Shown once. |
| `/settings`| **Settings** | Full settings panel. AI providers, Vosk models, theme, data management. |

### How It Works

1. **New session**: User clicks `+ New` in sidebar → picks a template (predefined LLM prompt) → starts chatting
2. **Dictate mode**: User clicks 🎤 → speaks → Vosk transcribes in real-time → transcript appears as user message
3. **Type mode**: User can also type directly (like ChatGPT)
4. **LLM generates**: Template (system prompt) + user message → LLM → polished response streams in
5. **Multi-turn**: User can refine by speaking/typing again in the same session
6. **Save**: Sessions auto-save. User can rename, delete from sidebar.

---

## Data Flow

### 1. Speech-to-Text Flow

```
Browser                    Bun Server                   Vosk
  │                            │                          │
  │  getUserMedia() ───►       │                          │
  │  AudioWorklet captures     │                          │
  │  PCM 16kHz mono            │                          │
  │                            │                          │
  │ ── WebSocket connect ────► │                          │
  │                            │                          │
  │ ── audio chunks ─────────► │                          │
  │    (binary PCM frames)     │ ── accept_waveform() ──► │
  │                            │                          │
  │                            │ ◄── partial result ───── │
  │ ◄── partial transcript ─── │                          │
  │    (updates live on UI)    │                          │
  │                            │ ◄── final result ─────── │
  │ ◄── final transcript ───── │                          │
  │    (committed line)        │                          │
  │                            │                          │
  │ ── close connection ─────► │ ── free recognizer ────► │
  │                            │                          │
```

### 2. Prompt Generation Flow

```
Browser                    Bun Server                  LLM Provider
  │                            │                          │
  │  User dictates or types    │                          │
  │  in chat session           │                          │
  │                            │                          │
  │ ── POST /api/generate ───► │                          │
  │    { systemPrompt,         │                          │
  │      messages[] }          │                          │
  │                            │                          │
  │                            │  systemPrompt = template │
  │                            │  messages = conversation │
  │                            │                          │
  │                            │ ── POST /chat/complete ► │
  │                            │    (OpenAI-compat API)   │
  │                            │                          │
  │                            │ ◄── streamed response ── │
  │                            │                          │
  │ ◄── SSE / streamed text ── │                          │
  │    (polished prompt)       │                          │
  │                            │                          │
  │  Auto-saves to session     │                          │
  │ ── PUT /api/sessions/:id ► │ ── write to /data ─────► │
  │                            │                          │
```

### 3. Storage Flow

```
Bun Server                        Host Filesystem (via bind mount)
  │                                     │
  │ ── read/write sessions ───────────► /data/prompts/*.json
  │ ── read/write templates ──────────► /data/templates/local/*.md
  │ ── read community templates ──────► /data/templates/community/*.md
  │ ── read/write config ────────────► /data/config/settings.json
  │ ── read models ──────────────────► /data/models/<model-name>/
  │ ── download new models ─────────► /data/models/<model-name>/
  │                                     │
```

---

## What Are Templates?

Templates are **predefined system prompts for the LLM**. That's it.

**Templates are NOT**:
- Variable interpolation engines
- A complex template language with `{{variables}}`
- Something separate from prompts conceptually

**Templates ARE**:
- System prompts (the `system` role message sent to the LLM)
- Predefined instructions like "You are a code reviewer. Given the user's description, generate a structured review request."
- Two sources: **local** (user-created) and **community** (from a remote repo, P2)

When the user creates a new chat session, they pick a template. That template becomes the system prompt for the entire session. The user's dictation/text becomes the user message. The LLM responds per the template's instructions.

---

## Tech Stack

| Layer        | Technology                     | Role                                                  |
| ------------ | ------------------------------ | ----------------------------------------------------- |
| **Frontend** | React 18+                      | UI framework — SPA served as static files             |
| **Frontend** | TypeScript                     | Type safety across the entire codebase                |
| **Frontend** | Vite                           | Frontend build tool — fast HMR in dev, optimized prod |
| **Frontend** | Tailwind CSS                   | Utility-first styling                                 |
| **Frontend** | ShadCN/ui                      | Component library (built on Radix primitives)         |
| **Frontend** | Web Audio API / AudioWorklet   | Mic capture → PCM 16kHz mono for WebSocket streaming  |
| **Backend**  | Bun                            | Runtime — serves API, static files, WebSocket, FFI    |
| **Backend**  | Hono                           | Lightweight web framework (runs on Bun natively)      |
| **STT**      | Vosk (libvosk.so via bun:ffi)  | Local speech-to-text — no cloud, no npm package       |
| **AI**       | OpenAI-compatible SDK          | Proxy LLM calls to user-configured provider (OpenRouter recommended) |
| **Storage**  | Filesystem (JSON + Markdown)   | Sessions as JSON, templates as `.md` with YAML frontmatter |
| **Config**   | JSON files                     | Settings, provider keys, model selection               |
| **Delivery** | Docker (single container)      | Multi-stage build, bind mount for data                |

---

## Libraries & Dependencies

### Frontend (client)

| Package               | Purpose                                           |
| --------------------- | ------------------------------------------------- |
| `react`, `react-dom`  | UI rendering                                      |
| `react-router-dom`    | Client-side routing (SPA)                         |
| `tailwindcss`         | Utility CSS                                       |
| `@shadcn/ui`          | Component primitives (Button, Dialog, Input, etc) |
| `lucide-react`        | Icon set                                          |
| `react-markdown`      | Render markdown in chat responses                 |
| `sonner`              | Toast notifications                               |
| `zustand`             | Lightweight client state management               |

### Backend (server)

| Package / Binding     | Purpose                                                      |
| --------------------- | ------------------------------------------------------------ |
| `hono`                | HTTP/WebSocket framework (Bun-native, fast)                  |
| `bun:ffi` (built-in)  | Call `libvosk.so` directly — Vosk C API bindings             |
| `openai`              | OpenAI-compatible SDK (works with OpenRouter, OpenAI, Ollama, any compatible endpoint) |
| `gray-matter`         | Parse/serialize YAML frontmatter for template files          |
| `zod`                 | Request/config validation                                    |
| `nanoid`              | Generate unique IDs for sessions and templates               |

### System (inside Docker)

| Dependency            | Purpose                                           |
| --------------------- | ------------------------------------------------- |
| `libvosk.so`          | Vosk shared library (bundled in image)            |
| Vosk model files      | Downloaded on-demand to `/data/models/`           |

### Dev Tooling

| Tool                  | Purpose                                           |
| --------------------- | ------------------------------------------------- |
| `typescript`          | Type checking                                     |
| `vite`                | Frontend dev server + bundler                     |
| `eslint`              | Linting                                           |
| `prettier`            | Code formatting                                   |
| `docker`              | Containerization                                  |

---

## Project File Structure

```
GetThatQuick/
├── docs/
│   ├── PRD.md
│   ├── architecture.md          # this file
│   └── Checklist.md
│
├── client/                      # React frontend (Vite) — NOT BUILT YET
│   └── (TBD — user is designing)
│
├── server/                      # Bun backend
│   ├── package.json
│   ├── tsconfig.json
│   ├── models.json              # Vosk model manifest
│   ├── src/
│   │   ├── index.ts             # Entry — Hono server, static files, SPA fallback
│   │   │
│   │   ├── routes/
│   │   │   ├── sessions.ts      # CRUD: /api/sessions
│   │   │   ├── templates.ts     # CRUD: /api/templates
│   │   │   ├── generate.ts      # POST /api/generate (LLM proxy, streaming)
│   │   │   ├── models.ts        # GET/POST/DELETE /api/models
│   │   │   └── settings.ts      # GET/PUT /api/settings
│   │   │
│   │   ├── ws/
│   │   │   └── stt.ts           # WebSocket handler — audio in, transcript out
│   │   │
│   │   ├── services/
│   │   │   ├── vosk.ts          # Higher-level Vosk service (model cache, recognizer lifecycle)
│   │   │   ├── llm.ts           # OpenAI-compatible LLM client
│   │   │   ├── sessions.ts      # Read/write session JSON files
│   │   │   ├── templates.ts     # Read/write template .md files
│   │   │   ├── models.ts        # Download, extract, manage Vosk models
│   │   │   └── config.ts        # Read/write settings.json
│   │   │
│   │   ├── lib/
│   │   │   ├── ffi.ts           # Low-level Vosk C API FFI declarations
│   │   │   ├── paths.ts         # Data directory resolution (~/.getthatquick or /data)
│   │   │   └── constants.ts     # Defaults, sample rates, etc.
│   │   │
│   │   └── types/
│   │       └── index.ts         # Server-specific types
│   │
│   └── seed/                    # Default templates seeded on first launch
│       ├── code-review.md
│       ├── bug-report.md
│       ├── meeting-summary.md
│       ├── prompt-polish.md
│       └── email-draft.md
│
├── shared/                      # Shared types between client & server
│   └── types.ts
│
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .gitignore
├── README.md
│
└── test/                        # Existing PoC / test scripts (reference only)
    ├── live_transcribe.py
    ├── record_audio.py
    ├── speaker_id.py
    ├── main.py
    ├── pyproject.toml
    ├── javascript/
    │   └── live_transcribe.ts
    ├── model/
    └── model-spk/
```

---

## Data Directory Structure

Data lives at `~/.getthatquick/` on the host (all platforms). In Docker, it's bind-mounted to `/data`.

**Path resolution:**
- **macOS / Linux**: `$HOME/.getthatquick/`
- **Windows**: `%USERPROFILE%\.getthatquick\`
- **Docker**: `/data` (bind-mounted from host's `~/.getthatquick`)

```
~/.getthatquick/
├── prompts/                         # chat sessions (each = a JSON file)
│   ├── sess_abc123.json
│   ├── sess_def456.json
│   └── ...
│
├── templates/                       # predefined LLM system prompts
│   ├── local/                       # user-created templates
│   │   ├── my-custom-review.md
│   │   └── ...
│   └── community/                   # from remote repo (P2, empty for MVP)
│       └── ...
│
├── models/                          # downloaded Vosk models
│   ├── vosk-model-small-en-us-0.15/
│   │   ├── final.mdl
│   │   ├── conf/
│   │   ├── graph/
│   │   └── ivector/
│   ├── vosk-model-en-us-0.22/
│   └── ...
│
└── config/
    └── settings.json
```

### Session File Format (JSON)

Each session is a ChatGPT-like conversation stored as JSON.

```json
{
  "id": "sess_abc123",
  "title": "Code Review — Auth Module",
  "templateId": "code-review",
  "createdAt": "2026-02-24T10:30:00Z",
  "updatedAt": "2026-02-24T10:35:00Z",
  "messages": [
    {
      "id": "msg_1",
      "role": "user",
      "content": "I changed the authentication module to support OAuth2 with Google and GitHub providers. The main changes are in the auth middleware and the callback handler.",
      "source": "voice",
      "timestamp": "2026-02-24T10:31:00Z"
    },
    {
      "id": "msg_2",
      "role": "assistant",
      "content": "## Code Review Request\n\n### Summary of Changes\nThe authentication module has been updated to support OAuth2...\n\n### Areas to Review\n1. Auth middleware changes...\n2. Callback handler...",
      "timestamp": "2026-02-24T10:31:05Z"
    }
  ]
}
```

### Template File Format (Markdown + YAML frontmatter)

Templates are just system prompts. Simple.

```markdown
---
id: "code-review"
title: "Code Review Request"
description: "Generates a structured code review request from your description"
category: "development"
tags: ["code", "review", "pr"]
createdAt: "2026-02-24T00:00:00Z"
updatedAt: "2026-02-24T00:00:00Z"
---

You are an expert senior developer. The user will describe code changes they've made.
Generate a well-structured code review request based on their description.

Include:
1. Summary of changes
2. Key areas to review
3. Potential risks or concerns
4. Questions for the reviewer

Keep the tone professional and the structure clear.
```

The markdown body IS the system prompt. No variables, no interpolation. The LLM receives this as the `system` message and the user's dictation/text as the `user` message.

### Settings File (settings.json)

```json
{
  "ai": {
    "provider": "openrouter",
    "providers": {
      "openrouter": {
        "apiKey": "",
        "model": "anthropic/claude-3.5-sonnet",
        "baseUrl": "https://openrouter.ai/api/v1"
      },
      "openai": {
        "apiKey": "",
        "model": "gpt-4o",
        "baseUrl": "https://api.openai.com/v1"
      },
      "custom": {
        "apiKey": "",
        "model": "",
        "baseUrl": "http://localhost:11434/v1"
      }
    }
  },
  "stt": {
    "activeModel": "vosk-model-small-en-us-0.15",
    "sampleRate": 16000
  },
  "general": {
    "theme": "dark"
  },
  "onboarding": {
    "completed": false
  }
}
```

---

## Docker Architecture

### Single Container Design

Everything runs in **one container** — no sidecar services, no docker-compose required (compose file provided only for convenience).

```
┌─────────────────────────────────────────┐
│           Docker Container              │
│                                         │
│   Bun runtime                           │
│     ├── Serves built React SPA          │
│     ├── REST API (Hono)                 │
│     ├── WebSocket endpoint              │
│     └── Vosk FFI (libvosk.so)           │
│                                         │
│   /data ← bind mount to host           │
│                                         │
│   Exposes: port 3000                    │
└─────────────────────────────────────────┘
```

### Dockerfile (multi-stage, multi-arch)

```dockerfile
# Stage 1: Build React frontend
FROM oven/bun:1 AS builder
WORKDIR /build
COPY client/ ./client/
COPY server/ ./server/
COPY shared/ ./shared/
RUN cd client && bun install && bun run build
RUN cd server && bun install

# Stage 2: Runtime
FROM oven/bun:1-slim
WORKDIR /app

ARG TARGETARCH
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget unzip ca-certificates && \
    if [ "$TARGETARCH" = "arm64" ]; then \
      VOSK_ARCH="aarch64"; \
    else \
      VOSK_ARCH="x86_64"; \
    fi && \
    wget -qO /tmp/vosk.zip "https://github.com/alphacep/vosk-api/releases/download/v0.3.45/vosk-linux-${VOSK_ARCH}-0.3.45.zip" && \
    unzip /tmp/vosk.zip -d /tmp/vosk && \
    cp /tmp/vosk/*/libvosk.so /usr/lib/ && \
    ldconfig && \
    rm -rf /tmp/vosk* && \
    apt-get purge -y wget unzip && apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /build/server ./server
COPY --from=builder /build/client/dist ./client/dist
COPY --from=builder /build/shared ./shared

EXPOSE 3000
VOLUME /data

CMD ["bun", "run", "server/src/index.ts"]
```

### Run Commands

```bash
docker run -d -p 3000:3000 -v ~/.getthatquick:/data getthatquick

# Or with docker-compose
docker compose up -d
```

### docker-compose.yml

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ~/.getthatquick:/data
    restart: unless-stopped
```

> **Windows**: Use `%USERPROFILE%\.getthatquick:/data` instead of `~`.

---

## Vosk Model Management

### How Models are Handled

1. `models.json` manifest bundled in server — lists available models
2. Onboarding prompts user to download a model on first launch
3. User can manage models in Settings (download, switch, delete)
4. Models download to `/data/models/`, persist on host
5. Active model stored in `settings.json`

### Model Loading is Session-Scoped

1. User presses **Dictate** → WebSocket opens
2. Server loads active model (or reuses cached pointer if same model)
3. Creates recognizer for this session
4. Audio in → transcription out
5. User stops → recognizer freed, WebSocket closes

Model switch = change setting, next dictation uses new model. No restart needed.

### No-Model State

- Chat area shows: "No speech model downloaded. Go to Settings to download one."
- Dictate button disabled
- WebSocket rejects with descriptive error
- Onboarding handles this on first launch

### models.json

```json
[
  {
    "id": "vosk-model-small-en-us-0.15",
    "name": "English (US) — Small",
    "language": "en-us",
    "size": "40 MB",
    "accuracy": "10.38 WER",
    "minRAM": "256 MB",
    "url": "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip",
    "default": true
  },
  {
    "id": "vosk-model-en-us-0.22",
    "name": "English (US) — Large",
    "language": "en-us",
    "size": "1.8 GB",
    "accuracy": "5.69 WER",
    "minRAM": "4 GB",
    "url": "https://alphacephei.com/vosk/models/vosk-model-en-us-0.22.zip",
    "default": false
  }
]
```

---

## AI Provider Integration

- Browser **never** calls LLM APIs directly — proxied through Bun server
- API keys stored server-side in `settings.json`
- Uses `openai` npm SDK (OpenAI-compatible)

| Provider   | Base URL                           | Notes                              |
| ---------- | ---------------------------------- | ---------------------------------- |
| OpenRouter | `https://openrouter.ai/api/v1`    | **Recommended.** 100+ models including Claude. |
| OpenAI     | `https://api.openai.com/v1`       | GPT-4o, GPT-4, etc.               |
| Custom     | User-defined                       | Ollama, LM Studio, vLLM, etc.     |

> **No direct Anthropic.** Use OpenRouter for Claude access.

---

## Key Architectural Decisions

| Decision                          | Choice                     | Rationale                                                        |
| --------------------------------- | -------------------------- | ---------------------------------------------------------------- |
| Single container                  | Yes                        | One `docker run` and done                                        |
| UI paradigm                       | ChatGPT-like               | Familiar, minimal pages, everything in one view                  |
| Data location                     | `~/.getthatquick/`         | Home directory on all platforms, hidden dot-folder convention     |
| Templates = system prompts        | Yes                        | No variable interpolation, just LLM instructions                 |
| Sessions format                   | JSON files                 | Structured message arrays, auto-save friendly                    |
| Templates format                  | Markdown + YAML frontmatter| Human-readable, git-friendly                                     |
| Backend runtime                   | Bun                        | FFI proven in PoC, TypeScript-native                             |
| Vosk integration                  | bun:ffi to libvosk.so      | Direct C API, already proven in tests                            |
| Vosk model loading                | Session-scoped + cached    | Load on dictate, cache in memory, no restart on switch           |
| Storage                           | Bind mount, no volumes     | User owns data, portable, inspectable                            |
| LLM integration                   | Server-side proxy           | API keys secure, single SDK                                      |
| No direct Anthropic               | OpenRouter instead         | Anthropic API not OpenAI-compatible                              |
| Multi-arch Docker                 | x86_64 + aarch64           | Intel, AMD, Apple M-series, ARM Linux                            |
| Web framework                     | Hono                       | Minimal, fast, Bun-native, WebSocket support                     |

---

## Concurrency & Limits

Personal single-user tool. One user, maybe two tabs.

- Each WebSocket gets its own `VoskRecognizer`
- All recognizers share the cached `VoskModel`
- ~2-3 concurrent recognizers on 4 GB RAM (small model). Large model: one at a time.
- No connection limiting for MVP; server warns on multiple simultaneous STT sessions
