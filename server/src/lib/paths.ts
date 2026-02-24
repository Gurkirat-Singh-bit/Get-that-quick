// ── Data directory resolution ─────────────────────────────────────────────
//
// Priority: DATA_DIR env → ~/.getthatquick/
// In Docker the env var is set to /data (bind-mounted from host).
// In dev mode it falls back to ~/.getthatquick/ on the host.

import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";

const DATA_DIR_NAME = ".getthatquick";

// ── Getters ───────────────────────────────────────────────────────────────

export function getDataDir(): string {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  return join(homedir(), DATA_DIR_NAME);
}

export function getPromptsDir(): string {
  return join(getDataDir(), "prompts");
}

export function getTemplatesDir(): string {
  return join(getDataDir(), "templates");
}

export function getLocalTemplatesDir(): string {
  return join(getTemplatesDir(), "local");
}

export function getCommunityTemplatesDir(): string {
  return join(getTemplatesDir(), "community");
}

export function getModelsDir(): string {
  return join(getDataDir(), "models");
}

export function getConfigDir(): string {
  return join(getDataDir(), "config");
}

export function getSettingsPath(): string {
  return join(getConfigDir(), "settings.json");
}

// ── Init ──────────────────────────────────────────────────────────────────

/** Create data directory tree if it doesn't exist. */
export function ensureDataDirs(): void {
  const dirs = [
    getPromptsDir(),
    getLocalTemplatesDir(),
    getCommunityTemplatesDir(),
    getModelsDir(),
    getConfigDir(),
  ];
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}
