---
sidebar_position: 2
title: Getting Started
---

# Getting Started

## Prerequisites

- **Docker** and **Docker Compose** (for production)
- **Bun 1.2+** (for local development)
- An LLM API key (OpenRouter, OpenAI, or local Ollama)

## Quick Start (Docker)

```bash
git clone https://github.com/Gurkirat-Singh-bit/Get-that-quick.git
cd Get-that-quick
docker compose up --build -d
```

Open **http://localhost:12233** in your browser.

All persistent data is stored at `~/getthatquick/` on your host machine:

```text
~/getthatquick/
├── prompts/           # Session JSON files
├── templates/
│   ├── local/         # Your custom templates
│   └── community/     # Synced from GitHub
├── models/            # Downloaded Vosk STT models
└── config/
    └── settings.json  # App configuration
```

## Development Setup

### 1. Clone & Install

```bash
git clone https://github.com/Gurkirat-Singh-bit/Get-that-quick.git
cd Get-that-quick

# Install server dependencies
cd server && bun install

# Install client dependencies
cd ../client && bun install
```

### 2. Start Dev Servers

**Terminal 1 — Server** (port 3000):
```bash
cd server
bun run dev
```

**Terminal 2 — Client** (port 5173 with API proxy):
```bash
cd client
bun run dev
```

The Vite dev server proxies `/api` and `/ws` requests to `localhost:3000`.

### 3. First-Run Setup

On first launch, the **Onboarding Wizard** will guide you through:

1. **Welcome** — Overview of features
2. **Voice Model** — Download a Vosk STT model (optional, skip if you don't need voice)
3. **LLM Provider** — Select and configure your AI provider
4. **API Keys** — Enter API keys for your chosen provider
5. **Done** — Review your configuration

### 4. Configure an LLM Provider

| Provider | Base URL | Notes |
|----------|----------|-------|
| **OpenRouter** | `https://openrouter.ai/api/v1` | Recommended — access to 200+ models |
| **OpenAI** | `https://api.openai.com/v1` | Direct OpenAI access |
| **Ollama** | `http://localhost:11434/v1` | Local models, no API key needed |
| **LM Studio** | `http://localhost:1234/v1` | Local models, no API key needed |
| **Custom** | Any OpenAI-compatible URL | Works with any compatible endpoint |

## Build for Production

```bash
# Build the client
cd client && bun run build

# The server serves the built client from client/dist/
cd ../server && bun run start
```

## Docker Configuration

The `docker-compose.yml` maps:

| Setting | Value |
|---------|-------|
| Container port | `3000` |
| Host port | `12233` |
| Data volume | `~/getthatquick:/data` |
| Restart policy | `unless-stopped` |

Environment variables:
- `PORT` — Server port inside container (default: `3000`)
- `DATA_DIR` — Data directory inside container (default: `/data`)
