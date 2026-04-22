# GetThatQuick

Self-hosted AI prompt workbench with local or cloud speech-to-text, reusable templates, and multi-provider LLM support.

- Version: `v1.1.0`
- Docs: <https://gurkirat-singh-bit.github.io/Get-that-quick/>
- License: CC BY-NC 4.0

## Quick Start

```bash
git clone https://github.com/Gurkirat-Singh-bit/Get-that-quick.git
cd Get-that-quick
docker compose up --build -d
```

Open `http://localhost:12233`.

## Stack

- Frontend: React 19 + Vite
- Backend: Bun + Hono
- Real-time STT: Bun built-in WebSocket server at `/ws/stt`
- Local STT: Vosk
- Shared contracts: TypeScript + Zod
- Deployment: single Docker container

## Docs

Use the docs site for:

- getting started
- architecture
- API reference
- changelog
- deployment guides

## Development

```bash
cd server && bun install && bun run dev
cd client && bun install && bun run dev
```

## License

See [LICENSE](LICENSE).
