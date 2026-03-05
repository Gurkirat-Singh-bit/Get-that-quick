---
sidebar_position: 1
title: Client Overview
---

# Client Overview

The GetThatQuick client is a **React 19 + Vite 7 + Tailwind CSS v4** single-page application. It uses **Bun** as the package manager and runtime for development scripts.

## Directory Structure

```
client/
├── components.json          # shadcn/ui configuration
├── eslint.config.js         # ESLint flat config
├── index.html               # Vite HTML entry point
├── package.json             # Dependencies and scripts
├── tsconfig.app.json        # App-level TypeScript config
├── tsconfig.json            # Root TypeScript config (references)
├── tsconfig.node.json       # Node/Vite TypeScript config
├── vite.config.ts           # Vite configuration
├── public/
│   └── fonts/               # Custom font files (GTQ Custom)
└── src/
    ├── App.tsx               # Root component (routing logic)
    ├── index.css             # Global styles + Tailwind directives
    ├── main.tsx              # React DOM entry point
    ├── vite-env.d.ts         # Vite type declarations
    ├── api/
    │   └── client.ts         # HTTP/SSE API client (637 lines)
    ├── components/
    │   ├── brand/            # Logo and icon components
    │   ├── chat/             # Chat area, input, message rendering
    │   ├── layout/           # Icon rails (left + right)
    │   ├── settings/         # Config panel + settings overlay
    │   ├── sidebar/          # Left and right sidebars
    │   ├── templates/        # Template editor modal
    │   └── ui/               # shadcn/ui primitives
    ├── hooks/
    │   ├── use-sessions.ts   # Session lifecycle + LLM streaming
    │   ├── use-settings.ts   # Settings state wrapper
    │   └── use-templates.ts  # Template CRUD + community sync
    ├── lib/
    │   ├── accent.ts         # Accent color system
    │   └── utils.ts          # cn() utility (clsx + tailwind-merge)
    └── pages/
        ├── dashboard.tsx     # Main app shell
        └── onboarding.tsx    # First-run setup wizard
```

## Entry Points

### `main.tsx`

Mounts the `<App />` component into the `#root` DOM element using `ReactDOM.createRoot`.

### `App.tsx`

Acts as the top-level router. It checks whether the user has completed onboarding via settings state:

- **No settings / not onboarded** → renders the **Onboarding** page
- **Onboarded** → renders the **Dashboard** page

## Key Dependencies

| Package | Version | Purpose |
|---|---|---|
| `react` | 19 | UI framework |
| `vite` | 7 | Dev server and bundler |
| `tailwindcss` | 4 | Utility-first CSS |
| `@radix-ui/*` | latest | Accessible UI primitives |
| `lucide-react` | latest | Icon library |
| `react-markdown` | latest | Markdown rendering |
| `remark-gfm` | latest | GitHub Flavored Markdown support |
| `rehype-raw` | latest | Raw HTML in markdown |
| `clsx` | latest | Conditional class names |
| `tailwind-merge` | latest | Merge Tailwind classes without conflicts |
| `class-variance-authority` | latest | Component variant management (CVA) |

## Vite Configuration

```ts
// vite.config.ts
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": "./src",
      "@shared": "../shared",
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:3000",
      "/ws": {
        target: "ws://localhost:3000",
        ws: true,
      },
    },
  },
});
```

**Plugins:**
- `react()` — React Fast Refresh + JSX transform
- `tailwindcss()` — Tailwind CSS v4 integration

**Path Aliases:**
- `@` → `./src` — shorthand for source imports
- `@shared` → `../shared` — access shared schemas and types

**Dev Proxy:**
- `/api` → `http://localhost:3000` — proxies API requests to the backend server
- `/ws` → `ws://localhost:3000` — proxies WebSocket connections (used for STT)

## Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `bunx vite` | Start Vite dev server with HMR |
| `build` | `tsc -b && vite build` | Type-check then production build |
| `lint` | `eslint .` | Run ESLint |
| `preview` | `vite preview` | Preview production build locally |

## CSS & Styling

The client uses **Tailwind CSS v4** with the new `@theme` directive for design tokens. Global styles live in `src/index.css` and include:

- **Dark mode color scheme** defined via `@theme` with CSS custom properties
- **Custom scrollbar styling** for a consistent look across browsers
- **Custom `@font-face`** declarations for the GTQ Custom font (loaded from `public/fonts/`)
- **`@custom-variant dark`** for dark-mode utility variants

See the [Styling & Theming](./styling.md) page for full details.
