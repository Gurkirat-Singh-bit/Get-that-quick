---
slug: /
sidebar_position: 1
title: Introduction
---

# GetThatQuick

**Self-hosted AI prompt workbench** with speech-to-text, reusable templates, and multi-provider LLM support — all in a single Docker container.

## What is GetThatQuick?

GetThatQuick is a local-first productivity tool that lets you:

- **Speak naturally** and convert voice into structured prompts (local Vosk or cloud Groq/OpenAI Whisper)
- **Use templates** to standardize prompt formatting across sessions
- **Chat with any LLM** via OpenRouter, OpenAI, Ollama, GitHub Copilot, or any OpenAI-compatible endpoint
- **Manage sessions** with full conversation history and project grouping
- **Stay fully local** — no cloud dependency, no telemetry

## Project Structure

```text
GetThatQuick/
├── client/              # React 19 + Vite + Tailwind v4 frontend
│   └── src/
│       ├── api/         # API client (fetch wrappers)
│       ├── components/  # UI components (chat, sidebar, settings, etc.)
│       ├── hooks/       # React hooks (sessions, settings, templates)
│       ├── lib/         # Utilities (accent theming, class merging)
│       └── pages/       # Dashboard & Onboarding pages
├── server/              # Bun + Hono backend
│   └── src/
│       ├── routes/      # REST API endpoints
│       ├── services/    # Business logic (LLM, sessions, templates, Vosk, Copilot)
│       ├── lib/         # Constants, errors, FFI bindings, paths
│       └── ws/          # WebSocket STT handler
├── shared/              # TypeScript types & Zod schemas (shared by client + server)
├── docs-site/           # This documentation site (Docusaurus)
├── Dockerfile           # Multi-stage Docker build
├── docker-compose.yml   # Single-container deployment
├── install.sh           # One-liner installer (Linux/macOS)
└── install.ps1          # One-liner installer (Windows)
```

## Key Features

| Feature | Description |
|---------|-------------|
| **Chat Interface** | ChatGPT-like UI with streaming, markdown, code blocks, thinking tokens |
| **Local STT** | Vosk — 20+ languages, runs entirely offline, no cloud APIs |
| **Cloud STT** | Groq Whisper (free, 8 hrs/day) or OpenAI Whisper — low RAM, fast setup |
| **GitHub Copilot** | OAuth device flow — access Claude, GPT-4.1, Gemini 2.5 Pro via your Copilot subscription |
| **Templates** | Create, browse, drag-to-chat. 220+ community templates from GitHub |
| **Multi-Provider** | OpenRouter, OpenAI, Ollama, LM Studio, GitHub Copilot, custom endpoints |
| **Projects** | Group sessions into projects with drag-and-drop |
| **Plan Mode** | AI asks clarifying questions before generating |
| **Document Upload** | Attach text/code files as context |
| **Customization** | Accent colors, fonts, system prompts, temperature, max tokens |
| **Self-Hosted** | Single Docker container, data at `~/getthatquick/` |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | [Bun](https://bun.sh) |
| Server Framework | [Hono](https://hono.dev) |
| Frontend | React 19 + Vite 7 + Tailwind CSS v4 |
| UI Primitives | Radix UI (via shadcn/ui pattern) |
| Icons | Lucide React |
| LLM Client | OpenAI SDK (compatible with any provider) |
| Local STT | Vosk via `bun:ffi` (libvosk.so) |
| Cloud STT | Groq Whisper / OpenAI Whisper (multipart upload) |
| Markdown | react-markdown + remark-gfm + rehype-raw |
| Storage | Filesystem (JSON sessions, Markdown templates) |
| Deployment | Docker (single container, multi-stage build) |

## License

CC BY-NC 4.0 — Free for personal and non-commercial use.
