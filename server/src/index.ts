/**
 * @fileoverview Server entry point for GetThatQuick.
 *
 * Starts a single Bun process that handles:
 * - REST API via Hono (`/api/*`)
 * - WebSocket speech-to-text at `/ws/stt`
 * - Serves the built React SPA for all other routes
 *
 * Data lives at `~/.getthatquick/` by default (or `DATA_DIR` env var in Docker).
 *
 * @module server
 * @license CC BY-NC 4.0 — {@link https://creativecommons.org/licenses/by-nc/4.0/}
 * @author Gurkirat Singh
 * @created 2026-02-25
 * @updated 2026-03-03
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { existsSync, readdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

import sessionsRoute from "./routes/sessions";
import templatesRoute from "./routes/templates";
import generateRoute from "./routes/generate";
import modelsRoute from "./routes/models";
import settingsRoute from "./routes/settings";
import sttRoute from "./routes/stt";
import authRoute from "./routes/auth";

import { ensureDataDirs, getLocalTemplatesDir, getDataDir } from "./lib/paths";
import { PORT } from "./lib/constants";
import { getSettings, saveSettings } from "./services/config";
import { DEFAULT_SETTINGS } from "./lib/constants";
import {
  handleSTTOpen,
  handleSTTMessage,
  handleSTTClose,
  type STTSessionData,
} from "./ws/stt";

// ── Bootstrap ────────────────────────────────────────────────────────────

console.log("[init] GetThatQuick server starting...");
console.log(`[init] Data directory: ${getDataDir()}`);

// Create data directory tree
ensureDataDirs();
console.log("[init] Data directories ready");

// Load or create settings
try {
  getSettings();
  console.log("[init] Settings loaded");
} catch {
  saveSettings(DEFAULT_SETTINGS);
  console.log("[init] Default settings created");
}

// Seed default templates if local/ is empty
seedTemplates();

// ── Hono app ─────────────────────────────────────────────────────────────

const app = new Hono();

// ── Structured logger ─────────────────────────────────────────────────────

const METHOD_COLORS: Record<string, string> = {
  GET: "\x1b[36m",    // cyan
  POST: "\x1b[32m",   // green
  PUT: "\x1b[33m",    // yellow
  DELETE: "\x1b[31m", // red
  PATCH: "\x1b[35m",  // magenta
};
const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const APP_VERSION = process.env.APP_VERSION ?? "1.1.0";

function colorStatus(status: number): string {
  if (status < 300) return `${GREEN}${status}${RESET}`;
  if (status < 400) return `${YELLOW}${status}${RESET}`;
  return `${RED}${status}${RESET}`;
}

function formatPath(path: string, settings: ReturnType<typeof getSettings>): string {
  // Add contextual info for key endpoints
  if (path === "/api/generate") {
    try {
      const p = settings.ai.provider;
      const m = settings.ai.providers[p]?.model ?? "?";
      return `${path} ${DIM}[${p}/${m}]${RESET}`;
    } catch { return path; }
  }
  if (path === "/api/stt/transcribe") {
    const p = settings.stt.provider ?? "local";
    const m = settings.stt.cloudModel ?? "";
    return `${path} ${DIM}[${p}${m ? "/" + m : ""}]${RESET}`;
  }
  if (path.startsWith("/api/auth/copilot")) {
    return `${path} ${DIM}[github-copilot]${RESET}`;
  }
  return path;
}

// Middleware
app.use("*", cors());
app.use("*", async (c, next) => {
  // Skip logging for static assets
  const path = new URL(c.req.url).pathname;
  if (path.startsWith("/assets/") || path.startsWith("/fonts/") || path === "/") {
    return next();
  }

  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  const method = c.req.method;
  const status = c.res.status;
  const color = METHOD_COLORS[method] ?? "\x1b[37m";

  let settings: ReturnType<typeof getSettings>;
  try { settings = getSettings(); } catch { settings = DEFAULT_SETTINGS as any; }

  const formattedPath = formatPath(path, settings);
  const msStr = ms > 500 ? `${YELLOW}${ms}ms${RESET}` : `${DIM}${ms}ms${RESET}`;

  console.log(`  ${color}${BOLD}${method}${RESET} ${formattedPath} → ${colorStatus(status)} ${msStr}`);
});

// API routes
app.route("/api/sessions", sessionsRoute);
app.route("/api/templates", templatesRoute);
app.route("/api/generate", generateRoute);
app.route("/api/models", modelsRoute);
app.route("/api/settings", settingsRoute);
app.route("/api/stt", sttRoute);
app.route("/api/auth", authRoute);

// Health check
app.get("/api/health", (c) =>
  c.json({
    ok: true,
    data: {
      status: "running",
      version: APP_VERSION,
      dataDir: getDataDir(),
    },
  })
);

// ── Static file serving ──────────────────────────────────────────────────
//
// Resolve the client dist directory relative to this source file
// so it works in both dev (CWD = server/) and Docker (CWD = /app).

const CLIENT_DIST = join(import.meta.dir, "../../client/dist");

// Static file serving (production — built React SPA)
app.use("/assets/*", async (c, next) => {
  const filePath = join(CLIENT_DIST, c.req.path);
  const file = Bun.file(filePath);
  if (await file.exists()) {
    return new Response(file);
  }
  return next();
});

app.use("/fonts/*", async (c, next) => {
  const filePath = join(CLIENT_DIST, c.req.path);
  const file = Bun.file(filePath);
  if (await file.exists()) {
    return new Response(file);
  }
  return next();
});

// Root-level static files (favicon, icons, images from public/)
app.use("/*", async (c, next) => {
  const path = new URL(c.req.url).pathname;
  // Only try static files if path has a file extension
  if (path.includes(".")) {
    const filePath = join(CLIENT_DIST, path);
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }
  }
  return next();
});

// SPA fallback — serve index.html for all non-API/non-WS routes
app.get("*", async (c) => {
  const indexPath = join(CLIENT_DIST, "index.html");
  const file = Bun.file(indexPath);
  if (await file.exists()) {
    return new Response(file, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  return c.text("Not Found", 404);
});

// ── Bun.serve (HTTP + WebSocket) ─────────────────────────────────────────

const server = Bun.serve<STTSessionData>({
  port: PORT,

  fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade for STT
    if (url.pathname === "/ws/stt") {
      const ok = server.upgrade(req, {
        data: { recognizer: null, lastActivity: Date.now() },
      });
      if (!ok) {
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return undefined;
    }

    // Everything else → Hono
    return app.fetch(req);
  },

  websocket: {
    open(ws) {
      handleSTTOpen(ws);
    },
    message(ws, message) {
      handleSTTMessage(ws, message as Buffer);
    },
    close(ws) {
      handleSTTClose(ws);
    },
  },
});

console.log(`[init] Server running at http://localhost:${server.port}`);

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Copy seed templates into the local templates folder on first run.
 * Skips if any `.md` files already exist in the local folder.
 */
function seedTemplates(): void {
  const localDir = getLocalTemplatesDir();
  const existing = existsSync(localDir)
    ? readdirSync(localDir).filter((f) => f.endsWith(".md"))
    : [];

  if (existing.length > 0) return; // already seeded

  const seedDir = join(import.meta.dir, "../../seed");
  if (!existsSync(seedDir)) {
    console.log("[init] No seed templates found, skipping");
    return;
  }

  const seeds = readdirSync(seedDir).filter((f) => f.endsWith(".md"));
  for (const file of seeds) {
    copyFileSync(join(seedDir, file), join(localDir, file));
  }
  console.log(`[init] Seeded ${seeds.length} default templates`);
}
