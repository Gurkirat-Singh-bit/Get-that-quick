---
sidebar_position: 1
title: System Overview
---

# System Overview

GetThatQuick is a self-hosted, Docker-packaged desktop AI assistant that combines prompt templates, multi-provider LLM chat, and offline speech-to-text in a single container.

## Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                      Docker Container                           │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Bun Server (Hono)                       │  │
│  │                                                           │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐  │  │
│  │  │  REST API    │  │  WebSocket   │  │  Static SPA     │  │  │
│  │  │  /api/*      │  │  /ws/stt     │  │  (React + Vite) │  │  │
│  │  └──────┬───────┘  └──────┬───────┘  └─────────────────┘  │  │
│  │         │                 │                                │  │
│  │         ▼                 ▼                                │  │
│  │  ┌─────────────┐  ┌──────────────┐                        │  │
│  │  │  Services    │  │  Vosk FFI    │                        │  │
│  │  │  (LLM, etc.) │  │  (bun:ffi)   │                        │  │
│  │  └──────┬───────┘  └──────┬───────┘                        │  │
│  │         │                 │                                │  │
│  └─────────┼─────────────────┼────────────────────────────────┘  │
│            │                 │                                   │
│            ▼                 ▼                                   │
│  ┌─────────────────┐  ┌──────────────┐                          │
│  │ ~/getthatquick/ │  │  libvosk.so  │                          │
│  │ (bind mount)    │  │  + models    │                          │
│  └─────────────────┘  └──────────────┘                          │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────┐       ┌──────────────────────┐
│       Browser          │       │   LLM Providers      │
│  (React SPA client)    │       │  (OpenAI, Ollama,    │
│                        │◄─────►│   OpenRouter, etc.)  │
└────────────────────────┘       └──────────────────────┘
```

## UI Model

GetThatQuick uses a **ChatGPT-like single-page layout** consisting of:

- **Left sidebar** — session list, new chat button, navigation
- **Chat area** — message thread with streaming responses, input bar at the bottom
- **Right sidebar** — template editor, model/config panels

The interface is designed to feel instantly familiar to anyone who has used ChatGPT, while adding template-driven prompt engineering on top.

## Routes

| Route       | Component     | Purpose                                      |
| ----------- | ------------- | --------------------------------------------- |
| `/`         | Dashboard     | Main chat interface with sidebar + chat area  |
| `/setup`    | Onboarding    | First-run setup wizard (API keys, model selection) |
| `/settings` | Settings      | Configuration overlay for providers, STT, UI  |

## Data Storage

All data is **filesystem-based** — no database required. Everything lives under `~/getthatquick/`:

| Data            | Format         | Location                          |
| --------------- | -------------- | --------------------------------- |
| Chat sessions   | JSON           | `~/getthatquick/sessions/`        |
| Templates       | Markdown + YAML frontmatter | `~/getthatquick/templates/` |
| Settings        | JSON           | `~/getthatquick/settings.json`    |
| Vosk models     | Binary         | `~/getthatquick/models/vosk/`     |

## Single Container Architecture

The entire application ships as a **single Docker container**:

- The Bun server handles REST API routes, WebSocket connections, and serves the pre-built static SPA — all from one process.
- Vosk's native `libvosk.so` is loaded via `bun:ffi` directly in the server process — no sidecar or microservice needed.
- A single bind mount at `~/getthatquick/` provides persistent storage for sessions, templates, settings, and STT models.
- The browser connects to the container on a single port for everything: API calls, WebSocket audio streaming, and the UI itself.

## Key Architectural Decisions

| #  | Decision                          | Rationale                                                                 |
| -- | --------------------------------- | ------------------------------------------------------------------------- |
| 1  | Single Docker container           | Simplest possible deployment for a desktop tool — one `docker run` command |
| 2  | ChatGPT-like UI                   | Familiar mental model reduces onboarding friction                         |
| 3  | `~/getthatquick/` data path       | Predictable, user-accessible location outside the container               |
| 4  | Templates = system prompts        | Templates map directly to the system prompt role in LLM APIs              |
| 5  | JSON sessions                     | Human-readable, no ORM, trivially portable                                |
| 6  | Markdown + YAML frontmatter templates | Authorable in any text editor, version-controllable                    |
| 7  | Bun runtime                       | Fast startup, native TypeScript, built-in FFI support                     |
| 8  | `bun:ffi` for Vosk                | Zero-overhead native calls without a C++ addon build step                 |
| 9  | Session-scoped model loading      | Vosk recognizers are created per WebSocket session, freeing memory on disconnect |
| 10 | Bind mounts                       | User data survives container rebuilds; editable from the host             |
| 11 | Server-side LLM proxy             | API keys stay on the server; client never touches provider APIs directly  |
| 12 | Hono framework                    | Lightweight, Bun-native, supports REST + WebSocket in one router          |
| 13 | Multi-arch Docker                 | Supports both `amd64` and `arm64` for broad desktop compatibility         |
| 14 | Filesystem storage over DB        | No migrations, no connection strings — just files                         |
| 15 | OpenAI SDK as universal client    | Works with any OpenAI-compatible API (Ollama, OpenRouter, LM Studio)      |
| 16 | SSE streaming                     | Token-by-token delivery for responsive chat UX                            |
| 17 | Shared types via monorepo         | Single source of truth for API contracts between client and server         |
