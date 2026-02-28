/**
 * @fileoverview React hook for application settings management.
 *
 * Loads settings from the server on mount, provides typed update
 * functions, and exposes provider test capability.
 *
 * @module hooks/use-settings
 */

import { useState, useEffect, useCallback } from "react";
import type { Settings } from "@shared/types";
import * as api from "@/api/client";

/** Return type of {@link useSettings}. */
export interface UseSettingsReturn {
  /** Current settings (null while loading). */
  settings: Settings | null;
  /** Whether settings are loading. */
  loading: boolean;
  /** Deep-merge partial settings and persist. */
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  /** Test an AI provider connection. Returns `true` on success. */
  testProvider: (config: { apiKey: string; model: string; baseUrl: string }) => Promise<boolean>;
  /** Refresh settings from server. */
  refresh: () => Promise<void>;
}

/**
 * Hook that manages application settings via the server API.
 *
 * @returns {UseSettingsReturn} Settings state and actions.
 */
export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  /** Load settings from server. */
  const refresh = useCallback(async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err) {
      console.error("[useSettings] Failed to load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Update settings on the server and refresh local state.
   *
   * @param updates - Partial settings to merge.
   */
  const updateSettings = useCallback(
    async (updates: Partial<Settings>) => {
      try {
        const merged = await api.updateSettings(updates);
        setSettings(merged);
      } catch (err) {
        console.error("[useSettings] Failed to update:", err);
      }
    },
    []
  );

  /**
   * Test a provider configuration.
   *
   * @param config - Provider config to test.
   * @returns `true` if connection succeeded.
   */
  const testProvider = useCallback(
    async (config: { apiKey: string; model: string; baseUrl: string }) => {
      try {
        const result = await api.testProvider(config);
        return result.connected;
      } catch {
        return false;
      }
    },
    []
  );

  return { settings, loading, updateSettings, testProvider, refresh };
}
