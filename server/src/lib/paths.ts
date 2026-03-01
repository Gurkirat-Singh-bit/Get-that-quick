// ── Data directory resolution ─────────────────────────────────────────────
//
// Priority: DATA_DIR env → ~/.getthatquick/
// In Docker the env var is set to /data (bind-mounted from host).
// In dev mode it falls back to ~/.getthatquick/ on the host.

import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";

const DATA_DIR_NAME = "getthatquick";

// ── Getters ───────────────────────────────────────────────────────────────

/**
 * Get the root data directory path.
 * Checks DATA_DIR environment variable first (used in Docker),
 * then falls back to ~/.getthatquick/ on the host.
 *
 * @returns Absolute path to the data directory.
 */
export function getDataDir(): string {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  return join(homedir(), DATA_DIR_NAME);
}

/**
 * Get the prompts/sessions directory path.
 *
 * @returns Absolute path to the directory containing session JSON files.
 */
export function getPromptsDir(): string {
  return join(getDataDir(), "prompts");
}

/**
 * Get the templates root directory path.
 *
 * @returns Absolute path to the templates directory (contains local/ and community/).
 */
export function getTemplatesDir(): string {
  return join(getDataDir(), "templates");
}

/**
 * Get the local templates directory path.
 * User-created templates are stored here.
 *
 * @returns Absolute path to the local templates directory.
 */
export function getLocalTemplatesDir(): string {
  return join(getTemplatesDir(), "local");
}

/**
 * Get the community templates directory path.
 * Templates synced from remote repos are stored here.
 *
 * @returns Absolute path to the community templates directory.
 */
export function getCommunityTemplatesDir(): string {
  return join(getTemplatesDir(), "community");
}

/**
 * Get the Vosk models directory path.
 * Downloaded speech recognition models are stored here.
 *
 * @returns Absolute path to the models directory.
 */
export function getModelsDir(): string {
  return join(getDataDir(), "models");
}

/**
 * Get the configuration directory path.
 *
 * @returns Absolute path to the config directory.
 */
export function getConfigDir(): string {
  return join(getDataDir(), "config");
}

/**
 * Get the full path to the settings JSON file.
 *
 * @returns Absolute path to settings.json.
 */
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
