<p align="center">
  <img src="client/public/vite.svg" width="80" alt="GetThatQuick logo" />
</p>

<h1 align="center">GetThatQuick</h1>

<p align="center">
  A self-hosted AI prompt workbench with speech-to-text, templates, and multi-provider LLM support.<br/>
  Runs in a single Docker container. Everything stays on your machine.
</p>

<p align="center">
  <a href="#features">Features</a> &middot;
  <a href="#quick-start">Quick Start</a> &middot;
  <a href="#configuration">Configuration</a> &middot;
  <a href="#architecture">Architecture</a> &middot;
  <a href="#license">License</a>
</p>

---

## Features

| Area | Details |
|------|---------|
| **Chat** | ChatGPT-like conversational UI with streaming responses, message editing, regeneration, and expansion |
| **LLM Providers** | OpenAI, OpenRouter, Ollama, and any OpenAI-compatible endpoint. Switch on the fly |
| **Speech-to-Text** | Local STT via Vosk (no cloud). 20+ language models. Dictation button in chat input |
| **Templates** | 220+ community prompt templates synced from GitHub. Create, edit, and organize your own |
| **Drag-to-Chat** | Drag any template onto the chat area to start a session with that system prompt |
| **Plan Mode** | Paginated multi-choice questionnaire before generation for structured planning |
| **Projects** | Group sessions into projects with color-coded folders and drag-and-drop |
| **Document Upload** | Attach text/code files as context for the LLM |
| **Thinking Tokens** | Collapsible display of model reasoning (Qwen, Claude, etc.) |
| **Config Panel** | Quick-access panel for model, temperature, max tokens, and system prompt |
| **Dark Theme** | Full dark UI with accent color customization |
| **Self-Hosted** | Single Docker container. Data stored on your filesystem. No telemetry |

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- An LLM API key (OpenRouter, OpenAI, or a running Ollama instance)

### Run with Docker Compose

```bash
git clone https://github.com/Gurkirat-Singh-bit/Get-that-quick.git
cd Get-that-quick
docker compose up --build -d
```

Open **http://localhost:12233** in your browser.

Data is stored at `~/getthatquick/` on the host, bind-mounted into the container at `/data`.

### Stop

```bash
docker compose down
```

---

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) v1.2+
- Node.js (for some tooling)

### Install & Run

```bash
# Server
cd server && bun install && bun run dev

# Client (separate terminal)
cd client && bun install && bun run dev
```

- Frontend: http://localhost:5173 (Vite dev server, proxies API to :3000)
- Backend: http://localhost:3000

---

## Configuration

On first launch, open **Settings** (gear icon in the left rail) to configure:

### LLM Provider

| Provider | Base URL | Notes |
|----------|----------|-------|
| OpenRouter | `https://openrouter.ai/api/v1` | 200+ models, pay-per-token |
| OpenAI | `https://api.openai.com/v1` | GPT-4o, o1, etc. |
| Ollama | `http://localhost:11434/v1` | Local models, no API key needed |
| Custom | Any OpenAI-compatible URL | Self-hosted inference servers |

### Speech-to-Text

1. Go to Settings > Voice
2. Download a Vosk model (e.g. `vosk-model-small-en-us-0.15` for English)
3. Activate it
4. Use the microphone button in the chat input

### Community Templates

Click the sync button (refresh icon) in the right sidebar's Community section to pull 220+ prompt templates from the [community repo](https://github.com/Gurkirat-Singh-bit/Get-that-quick-prompt-templates).

---

## Architecture

```
GetThatQuick/
+-- client/          React + Vite + Tailwind CSS v4 (SPA)
+-- server/          Hono + Bun (REST API + WebSocket STT)
+-- shared/          TypeScript types shared between client & server
+-- docs/            PRD, architecture docs, checklist
+-- test/            Vosk STT test scripts
+-- Dockerfile       Multi-stage build
+-- docker-compose.yml
```

### Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Bun |
| API Framework | Hono |
| Frontend | React 19, Vite, Tailwind CSS v4 |
| UI Components | Radix UI primitives |
| LLM Client | OpenAI SDK (all providers) |
| STT Engine | Vosk via Bun FFI (libvosk.so) |
| Markdown | react-markdown + rehype-highlight + remark-gfm |
| Data Storage | Filesystem (JSON sessions, Markdown templates) |
| Container | Docker (single container, multi-stage build) |

### Data Directory

```
~/getthatquick/
+-- config/
|   +-- settings.json       User settings (providers, API keys, preferences)
+-- prompts/                 Generated prompts archive
+-- templates/
|   +-- local/               User-created templates (.md with YAML frontmatter)
|   +-- community/           Synced from GitHub repo
+-- models/                  Downloaded Vosk STT models
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sessions` | List all sessions |
| POST | `/api/sessions` | Create a session |
| GET | `/api/sessions/:id` | Get session with messages |
| DELETE | `/api/sessions/:id` | Delete a session |
| GET | `/api/templates` | List all templates |
| POST | `/api/templates` | Create a local template |
| POST | `/api/templates/sync` | Sync community templates from GitHub |
| GET | `/api/settings` | Get settings |
| PUT | `/api/settings` | Update settings |
| POST | `/api/generate` | Stream LLM response (SSE) |
| GET | `/api/models` | List Vosk models |
| POST | `/api/models/:id/download` | Download a Vosk model (SSE progress) |
| GET | `/api/health` | Health check |
| WS | `/ws/stt` | WebSocket speech-to-text stream |

---

## Screenshots

> Coming soon

---

## Contributing

Contributions are welcome for non-commercial use under the license terms. To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m "feat: add my feature"`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0)**.

- **Free for personal and non-commercial use** -- use it, modify it, share it
- **Commercial use requires a separate license** -- contact the author to purchase commercial rights
- **Attribution required** -- credit the original project when redistributing

See the [LICENSE](LICENSE) file for the full legal text.

For commercial licensing inquiries, open an issue or contact the maintainer.

---

<p align="center">
  Built by <a href="https://github.com/Gurkirat-Singh-bit">Gurkirat Singh</a>
</p>
