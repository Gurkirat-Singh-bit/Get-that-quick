// ── GetThatQuick — Server entry point ─────────────────────────────────────
//
// Single Bun process serving:
//   • REST API (Hono)          →  /api/*
//   • WebSocket STT            →  /ws/stt
//   • Static files (React SPA) →  everything else
//
// Data directory: DATA_DIR env or ~/.getthatquick/

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { existsSync, readdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

import sessionsRoute from "./routes/sessions";
import templatesRoute from "./routes/templates";
import generateRoute from "./routes/generate";
import modelsRoute from "./routes/models";
import settingsRoute from "./routes/settings";

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

// Middleware
app.use("*", cors());
app.use("*", logger());

// API routes
app.route("/api/sessions", sessionsRoute);
app.route("/api/templates", templatesRoute);
app.route("/api/generate", generateRoute);
app.route("/api/models", modelsRoute);
app.route("/api/settings", settingsRoute);

// Health check
app.get("/api/health", (c) =>
  c.json({
    ok: true,
    data: {
      status: "running",
      version: "0.1.0",
      dataDir: getDataDir(),
    },
  })
);

// Static file serving (production — built React SPA)
app.use("/assets/*", serveStatic({ root: "../client/dist" }));

// SPA fallback — serve index.html for all non-API/non-WS routes
app.get("*", serveStatic({ root: "../client/dist", path: "/index.html" }));

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
