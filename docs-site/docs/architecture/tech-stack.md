---
sidebar_position: 2
title: Tech Stack
---

# Tech Stack

## Frontend

| Technology | Purpose |
| --- | --- |
| **React 19** | UI framework — concurrent features, server-friendly architecture |
| **Vite 7** | Build tool and dev server — fast HMR, optimized production builds |
| **Tailwind CSS v4** | Utility-first styling — zero-config CSS with the v4 engine |
| **Radix UI primitives** | Accessible, unstyled component primitives (via shadcn/ui CVA pattern) |
| **Lucide React** | Icon library — consistent, tree-shakeable SVG icons |
| **react-markdown** | Markdown rendering in chat messages |
| **remark-gfm** | GitHub Flavored Markdown support (tables, strikethrough, task lists) |
| **rehype-raw** | Allows raw HTML passthrough in rendered markdown |
| **@fontsource-variable/plus-jakarta-sans** | Self-hosted variable font — no external CDN dependency |

### UI Component Pattern

Components follow the **shadcn/ui CVA (Class Variance Authority) pattern**:

- Radix UI provides the accessible, unstyled primitives (dialogs, tooltips, scroll areas, etc.)
- Tailwind CSS handles all visual styling
- CVA manages component variant logic (size, color, state)
- Components are copied into the project (not imported from a package), giving full control

## Backend

| Technology | Purpose |
| --- | --- |
| **Bun** | JavaScript/TypeScript runtime — fast startup, native TS execution, built-in FFI |
| **Hono** | Web framework — lightweight, supports REST routes + WebSocket upgrades |
| **OpenAI SDK** | Universal LLM client — works with any OpenAI-compatible API endpoint |
| **gray-matter** | YAML frontmatter parser — extracts metadata from Markdown template files |
| **Zod** | Schema validation — validates API request/response shapes at runtime |
| **nanoid** | ID generation — compact, URL-safe unique identifiers for sessions and messages |

### Why Bun?

Bun is chosen as the runtime for several reasons:

1. **Native TypeScript** — no transpilation step needed; `.ts` files run directly
2. **Built-in FFI (`bun:ffi`)** — call native C libraries (like Vosk's `libvosk.so`) without writing C++ bindings or Node.js addons
3. **Fast startup** — important for a desktop tool that users expect to launch quickly
4. **Compatible ecosystem** — supports the vast majority of npm packages

## Speech-to-Text (STT)

| Technology | Purpose |
| --- | --- |
| **Vosk** | Offline speech recognition engine — no cloud API, fully local |
| **`bun:ffi`** | Foreign Function Interface — loads and calls `libvosk.so` natively |

### Vosk Details

- **28 models** available across **17 languages**
- Models are downloaded on demand and stored in `~/getthatquick/models/vosk/`
- Each WebSocket session creates a **session-scoped recognizer** — the Vosk model and recognizer are allocated when a client connects and freed when the connection closes
- Audio is received as **PCM Int16 at 16 kHz** over WebSocket, matching Vosk's expected input format
- Recognition results include both **partial** (interim) and **final** transcripts, streamed back as JSON frames

### Supported Languages

Vosk models cover: English, Chinese, French, German, Spanish, Portuguese, Russian, Japanese, Korean, Italian, Dutch, Polish, Ukrainian, Czech, Turkish, Vietnamese, and Hindi — with multiple model sizes per language.

## Infrastructure

| Technology | Purpose |
| --- | --- |
| **Docker** | Containerization — multi-stage build (frontend build → production image) |
| **docker-compose** | Orchestration — single-command startup with port and volume configuration |
| **Filesystem storage** | Persistence — JSON files for sessions/settings, Markdown files for templates |

### Docker Build

The Dockerfile uses a **multi-stage build**:

1. **Stage 1 (build)** — installs dependencies, builds the Vite frontend into static assets
2. **Stage 2 (production)** — copies built assets + server code into a minimal image with Bun and `libvosk.so`

The resulting image supports **multi-arch builds** (`amd64` + `arm64`) for broad desktop compatibility.

### Storage Layout

```text
~/getthatquick/
├── sessions/          # JSON chat session files
├── templates/         # Markdown template files with YAML frontmatter
├── models/
│   └── vosk/          # Downloaded Vosk STT model directories
└── settings.json      # Application configuration
```

## Monorepo Structure

The project uses a **shared directory** pattern for code shared between client and server:

```text
shared/
├── schemas.ts    # Zod schemas for API validation
└── types.ts      # TypeScript type definitions
```

Both the client and server reference shared code via the **`@shared/*` path alias**, configured in their respective `tsconfig.json` files. This ensures:

- **Single source of truth** for API request/response shapes
- **Type safety** across the full stack — the same Zod schemas validate on the server and infer types on the client
- **No publish step** — shared code is consumed directly via path aliases, not as a separate npm package
