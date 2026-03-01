// ── Settings service — read/write ~/.getthatquick/config/settings.json ────

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { getSettingsPath } from "../lib/paths";
import { DEFAULT_SETTINGS } from "../lib/constants";
import type { Settings } from "@shared/types";

let _cache: Settings | null = null;

/**
 * Return current settings (reads from disk on first call, cached after).
 *
 * @returns The current application settings object.
 * @throws {Error} If settings.json is corrupted or unreadable.
 */
export function getSettings(): Settings {
  if (_cache) return _cache;

  const path = getSettingsPath();
  if (!existsSync(path)) {
    saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = readFileSync(path, "utf-8");
    _cache = deepMerge(DEFAULT_SETTINGS as any, JSON.parse(raw)) as Settings;
    return _cache;
  } catch {
    _cache = DEFAULT_SETTINGS;
    return DEFAULT_SETTINGS;
  }
}

/**
 * Write full settings to disk and update cache.
 *
 * @param settings - Complete settings object to write.
 */
export function saveSettings(settings: Settings): void {
  const path = getSettingsPath();
  writeFileSync(path, JSON.stringify(settings, null, 2), "utf-8");
  _cache = settings;
}

/**
 * Deeply merge partial updates into current settings, write, return merged.
 *
 * @param partial - Partial settings to merge into current settings.
 * @returns The updated settings object after merging and saving.
 */
export function updateSettings(partial: Partial<Settings>): Settings {
  const current = getSettings();
  const merged = deepMerge(current as any, partial) as Settings;
  saveSettings(merged);
  return merged;
}

/** Drop the in-memory cache so next getSettings() re-reads from disk. */
export function invalidateCache(): void {
  _cache = null;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sourceValue = source[key as keyof T];
    if (
      sourceValue &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue)
    ) {
      result[key as keyof T] = deepMerge(
        (result[key as keyof T] ?? {}) as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[keyof T];
    } else {
      result[key as keyof T] = sourceValue as T[keyof T];
    }
  }
  return result;
}
