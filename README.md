<div align="center">
  <img src="docs-site/static/img/icon.png" width="100" alt="GetThatQuick Logo" />

  # GetThatQuick

  **Self-hosted AI prompt workbench with local speech-to-text, reusable templates, and multi-provider LLM support.**

  [![Version](https://img.shields.io/badge/version-v1.1.1-blue.svg)](https://github.com/Gurkirat-Singh-bit/Get-that-quick/releases)
  [![Docs](https://img.shields.io/badge/docs-available-success.svg)](https://gurkirat-singh-bit.github.io/Get-that-quick/)
  [![License](https://img.shields.io/badge/license-CC_BY--NC_4.0-lightgrey.svg)](LICENSE)
</div>

## Quick Start

```bash
# Linux / macOS
curl -fsSL https://raw.githubusercontent.com/Gurkirat-Singh-bit/Get-that-quick/main/install.sh | sh

# Windows (PowerShell - Run as Administrator)
irm https://raw.githubusercontent.com/Gurkirat-Singh-bit/Get-that-quick/main/install.ps1 | iex
```

Open `http://localhost:12233` once the container is running.

## Stack

- **Frontend:** React 19 + Vite
- **Backend:** Bun + Hono
- **Real-time STT:** Bun built-in WebSocket server + Vosk
- **Deployment:** Single Docker container

## Documentation

For full guides, architecture overviews, and API references, check out the [Documentation Site](https://gurkirat-singh-bit.github.io/Get-that-quick/).

## Development

```bash
cd server && bun install && bun run dev
cd client && bun install && bun run dev
```

## License

See [LICENSE](LICENSE) for more details.
