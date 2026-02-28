/**
 * @fileoverview React hook for template management.
 *
 * Wraps the template CRUD API with local React state, splitting
 * results into community and local buckets for the sidebar.
 *
 * @module hooks/use-templates
 */

import { useState, useEffect, useCallback } from "react";
import type { TemplateMeta, Template } from "@shared/types";
import * as api from "@/api/client";

/** Return type of {@link useTemplates}. */
export interface UseTemplatesReturn {
  /** Community-sourced templates (read-only). */
  community: TemplateMeta[];
  /** User-created local templates. */
  local: TemplateMeta[];
  /** Whether the list is loading. */
  loading: boolean;
  /** Whether a community sync is in progress. */
  syncing: boolean;
  /** Create a new local template. */
  createTemplate: (title: string, content: string, description?: string, category?: string) => Promise<Template>;
  /** Update an existing local template. */
  updateTemplate: (id: string, updates: Partial<Template>) => Promise<Template>;
  /** Delete a local template. */
  deleteTemplate: (id: string) => Promise<void>;
  /** Fetch full template content. */
  getTemplate: (id: string) => Promise<Template>;
  /** Refresh from server. */
  refresh: () => Promise<void>;
  /** Sync community templates from GitHub. */
  syncCommunity: (repoUrl?: string) => Promise<{ added: number; total: number }>;
}

/**
 * Hook that manages templates backed by the server API.
 *
 * @returns {UseTemplatesReturn} Template state and actions.
 */
export function useTemplates(): UseTemplatesReturn {
  const [community, setCommunity] = useState<TemplateMeta[]>([]);
  const [local, setLocal] = useState<TemplateMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  /** Load and split templates by source. */
  const refresh = useCallback(async () => {
    try {
      const all = await api.listTemplates();
      setCommunity(all.filter((t) => t.source === "community"));
      setLocal(all.filter((t) => t.source === "local"));
    } catch (err) {
      console.error("[useTemplates] Failed to list:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Create a local template.
   *
   * @param title       - Template title.
   * @param content     - System prompt content (markdown).
   * @param description - Short description.
   * @param category    - Category slug.
   * @returns The created template.
   */
  const createTemplate = useCallback(
    async (title: string, content: string, description?: string, category?: string) => {
      const tmpl = await api.createTemplate({ title, content, description, category });
      await refresh();
      return tmpl;
    },
    [refresh]
  );

  /**
   * Update a local template.
   *
   * @param id      - Template ID.
   * @param updates - Fields to update.
   * @returns The updated template.
   */
  const updateTemplate = useCallback(
    async (id: string, updates: Partial<Template>) => {
      const tmpl = await api.updateTemplate(id, updates);
      await refresh();
      return tmpl;
    },
    [refresh]
  );

  /**
   * Delete a local template.
   *
   * @param id - Template ID.
   */
  const deleteTemplate = useCallback(
    async (id: string) => {
      await api.deleteTemplate(id);
      await refresh();
    },
    [refresh]
  );

  /**
   * Sync community templates from GitHub.
   *
   * @param repoUrl - Optional custom repo URL.
   * @returns Sync result with count.
   */
  const syncCommunity = useCallback(
    async (repoUrl?: string) => {
      setSyncing(true);
      try {
        const result = await api.syncCommunityTemplates(repoUrl);
        await refresh();
        return result;
      } finally {
        setSyncing(false);
      }
    },
    [refresh]
  );

  return {
    community,
    local,
    loading,
    syncing,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplate: api.getTemplate,
    refresh,
    syncCommunity,
  };
}
