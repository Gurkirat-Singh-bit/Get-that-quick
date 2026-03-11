<p align="center">
  <img src="client/public/icon-white.png" width="80" alt="GetThatQuick logo" />
</p>

<h1 align="center">GetThatQuick</h1>

<p align="center">
  Self-hosted AI prompt workbench with local speech-to-text, templates, and multi-provider LLM support.<br/>
  Runs in a single Docker container. Everything stays on your machine.
</p>

<p align="center">
  <a href="https://gurkirat-singh-bit.github.io/Get-that-quick/">Documentation</a> &middot;
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
| **GitHub Copilot** | Connect your Copilot subscription (free for students) for access to Claude, GPT-4.1, Gemini 2.5 Pro |
| **Speech-to-Text** | Local Vosk (20+ languages, no cloud) or cloud Groq/OpenAI Whisper — your choice |
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

### One-liner Install (recommended)

**Linux / macOS** — installs git + Docker if needed, clones, and launches:

```bash
curl -fsSL https://raw.githubusercontent.com/Gurkirat-Singh-bit/Get-that-quick/main/install.sh | sh
```

**Windows** — run in PowerShell (as Administrator recommended):

```powershell
irm https://raw.githubusercontent.com/Gurkirat-Singh-bit/Get-that-quick/main/install.ps1 | iex
```

Both scripts clone the repo to `~/GetThatQuick`, build the Docker image, and start the app. Open **http://localhost:12233** when done.

### Manual (Docker Compose)

#### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- An LLM API key (OpenRouter, OpenAI, or a running Ollama instance)

```bash
git clone https://github.com/Gurkirat-Singh-bit/Get-that-quick.git
cd Get-that-quick
docker compose up --build -d
```

Open **http://localhost:12233** in your browser.

Data is stored at `~/getthatquick/` on the host, bind-mounted into the container at `/data`.

### Stop / Update

```bash
# Stop
docker compose down

# Update to latest
git pull && docker compose up --build -d
```

---

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) v1.2+

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

On first launch, the **Onboarding Wizard** guides you through provider setup. You can change everything later via **Settings** (gear icon in the left rail).

### LLM Providers

| Provider | Base URL | Notes |
|----------|----------|-------|
| OpenRouter | `https://openrouter.ai/api/v1` | 200+ models, pay-per-token |
| OpenAI | `https://api.openai.com/v1` | GPT-4o, o1, etc. |
| Ollama | `http://localhost:11434/v1` | Local models, no API key needed |
| Custom | Any OpenAI-compatible URL | Self-hosted inference servers |
| **GitHub Copilot** | auto | Free tier for students, OAuth device flow |

### GitHub Copilot (free models)

Connect your GitHub Copilot subscription to unlock Claude Sonnet/Opus 4.5/4.6, GPT-4.1, Gemini 2.5 Pro and more at no extra cost.

1. Go to **Settings → Models & LLM → Connect GitHub Copilot**
2. Enter the shown code at [github.com/login/device](https://github.com/login/device)
3. Select `github-copilot` as your active provider and pick a model

> GitHub Students get Copilot for free via the [Student Developer Pack](https://education.github.com).

### Speech-to-Text

| Mode | Setup | Notes |
|------|-------|-------|
| **Local (Vosk)** | Download a model in Settings → Voice | Fully offline, 20+ languages |
| **Groq Whisper** | Add a free API key from [console.groq.com](https://console.groq.com) | 8 hrs/day free, very fast |
| **OpenAI Whisper** | Use your existing OpenAI key | ~$0.006/min |

Switch modes anytime in **Settings → Voice / STT**.

### Community Templates

Click the sync button (refresh icon) in the right sidebar's Community section to pull 220+ prompt templates from the [community repo](https://github.com/Gurkirat-Singh-bit/Get-that-quick-prompt-templates).

---

## Architecture

```
GetThatQuick/
+-- client/          React 19 + Vite + Tailwind CSS v4 (SPA)
+-- server/          Hono + Bun (REST API + WebSocket STT)
+-- shared/          TypeScript types & Zod schemas
+-- docs-site/       Docusaurus documentation site
+-- Dockerfile       Multi-stage build
+-- docker-compose.yml
+-- install.sh       One-liner installer (Linux/macOS)
+-- install.ps1      One-liner installer (Windows)
```

> Full architecture documentation, API reference, and deployment guides are available at the **[docs site](https://gurkirat-singh-bit.github.io/Get-that-quick/)**.

### Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Bun |
| API Framework | Hono |
| Frontend | React 19, Vite, Tailwind CSS v4 |
| UI Components | Radix UI primitives |
| LLM Client | OpenAI SDK (all providers) |
| STT Engine | Vosk via Bun FFI (local) + Groq/OpenAI Whisper (cloud) |
| Markdown | react-markdown + rehype-highlight + remark-gfm |
| Data Storage | Filesystem (JSON sessions, Markdown templates) |
| Container | Docker (single container, multi-stage build) |

### Data Directory

```
~/getthatquick/
+-- config/
|   +-- settings.json       User settings (providers, API keys, preferences)
+-- prompts/                 Session & message history
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
| PUT | `/api/sessions/:id` | Update session |
| DELETE | `/api/sessions/:id` | Delete a session |
| GET | `/api/templates` | List all templates |
| POST | `/api/templates` | Create a local template |
| PUT | `/api/templates/:id` | Update a template |
| DELETE | `/api/templates/:id` | Delete a template |
| POST | `/api/templates/sync` | Sync community templates from GitHub |
| GET | `/api/settings` | Get settings |
| PUT | `/api/settings` | Update settings |
| POST | `/api/settings/test-provider` | Test provider connectivity |
| POST | `/api/generate` | Stream LLM response (SSE) |
| GET | `/api/models` | List Vosk models |
| POST | `/api/models/:id/download` | Download a Vosk model (SSE progress) |
| POST | `/api/stt/transcribe` | Cloud STT (Groq / OpenAI Whisper) |
| GET | `/api/auth/copilot/status` | Check Copilot connection |
| POST | `/api/auth/copilot/start` | Start Copilot OAuth device flow |
| POST | `/api/auth/copilot/poll` | Poll for OAuth completion |
| POST | `/api/auth/copilot/disconnect` | Disconnect Copilot |
| GET | `/api/health` | Health check |
| WS | `/ws/stt` | WebSocket real-time speech-to-text |

---

## Documentation

Full documentation is hosted with Docusaurus:

- **[Getting Started](https://gurkirat-singh-bit.github.io/Get-that-quick/docs/getting-started)** — Installation & setup
- **[Architecture](https://gurkirat-singh-bit.github.io/Get-that-quick/docs/architecture/overview)** — System design & data flow
- **[API Reference](https://gurkirat-singh-bit.github.io/Get-that-quick/docs/api/sessions)** — REST & WebSocket endpoints
- **[Cloud STT](https://gurkirat-singh-bit.github.io/Get-that-quick/docs/guides/cloud-stt)** — Groq & OpenAI Whisper setup
- **[GitHub Copilot](https://gurkirat-singh-bit.github.io/Get-that-quick/docs/guides/github-copilot)** — Free model access via Copilot
- **[Template Format](https://gurkirat-singh-bit.github.io/Get-that-quick/docs/guides/template-format)** — Writing prompt templates
- **[Docker Deployment](https://gurkirat-singh-bit.github.io/Get-that-quick/docs/guides/docker-deployment)** — Production deployment

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

- **Free for personal and non-commercial use** — use it, modify it, share it
- **Commercial use requires a separate license** — contact the author to purchase commercial rights
- **Attribution required** — credit the original project when redistributing

See the [LICENSE](LICENSE) file for the full legal text.

For commercial licensing inquiries, open an issue or contact the maintainer.

---

<p align="center">
  Built by <a href="https://github.com/Gurkirat-Singh-bit">Gurkirat Singh</a>
</p>
