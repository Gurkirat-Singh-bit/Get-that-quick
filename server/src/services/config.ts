// ── Settings service — read/write ~/.getthatquick/config/settings.json ────

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { getSettingsPath } from "../lib/paths";
import { DEFAULT_SETTINGS } from "../lib/constants";
import type { Settings } from "@shared/types";

let _cache: Settings | null = null;

/** Return current settings (reads from disk on first call, cached after). */
export function getSettings(): Settings {
  if (_cache) return _cache;

  const path = getSettingsPath();
  if (!existsSync(path)) {
    saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = readFileSync(path, "utf-8");
    _cache = deepMerge(DEFAULT_SETTINGS, JSON.parse(raw)) as Settings;
    return _cache;
  } catch {
    _cache = DEFAULT_SETTINGS;
    return DEFAULT_SETTINGS;
  }
}

/** Write full settings to disk and update cache. */
export function saveSettings(settings: Settings): void {
  const path = getSettingsPath();
  writeFileSync(path, JSON.stringify(settings, null, 2), "utf-8");
  _cache = settings;
}

/** Deeply merge partial updates into current settings, write, return merged. */
export function updateSettings(partial: Partial<Settings>): Settings {
  const current = getSettings();
  const merged = deepMerge(current, partial) as Settings;
  saveSettings(merged);
  return merged;
}

/** Drop the in-memory cache so next getSettings() re-reads from disk. */
export function invalidateCache(): void {
  _cache = null;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function deepMerge(
  target: Record<string, any>,
  source: Record<string, any>
): Record<string, any> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(result[key] ?? {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
