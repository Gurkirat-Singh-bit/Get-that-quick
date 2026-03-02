/**
 * @fileoverview HTTP routes for prompt template management.
 *
 * Handles listing, creating, updating, and deleting templates.
 * Also supports syncing community templates from a GitHub repo.
 *
 * Base path: `/api/templates`
 *
 * @module routes/templates
 * @license CC BY-NC 4.0 — {@link https://creativecommons.org/licenses/by-nc/4.0/}
 * @author Gurkirat Singh
 * @created 2026-02-25
 * @updated 2026-03-03
 */

import { Hono } from "hono";
import { nanoid } from "nanoid";
import * as svc from "../services/templates";
import type { Template } from "@shared/types";

const templates = new Hono();

/**
 * `GET /api/templates`
 *
 * Lists all templates (local and community), metadata only.
 */
templates.get("/", (c) => {
  return c.json({ ok: true, data: svc.listTemplates() });
});

/**
 * `GET /api/templates/categories`
 *
 * Lists all unique category names across all templates.
 */
templates.get("/categories", (c) => {
  return c.json({ ok: true, data: svc.listCategories() });
});

/**
 * `GET /api/templates/:id`
 *
 * Returns a single template with its full content.
 */
templates.get("/:id", (c) => {
  const tmpl = svc.getTemplate(c.req.param("id"));
  if (!tmpl) return c.json({ ok: false, error: "Template not found" }, 404);
  return c.json({ ok: true, data: tmpl });
});

/**
 * `POST /api/templates`
 *
 * Creates a new local template.
 * Requires `title` and `content`; other fields are optional.
 */
templates.post("/", async (c) => {
  const body = await c.req.json<{
    title: string;
    description?: string;
    category?: string;
    tags?: string[];
    content: string;
  }>();

  const now = new Date().toISOString();
  const tmpl: Template = {
    id: `tmpl_${nanoid(12)}`,
    title: body.title,
    description: body.description ?? "",
    category: body.category ?? "general",
    tags: body.tags ?? [],
    source: "local",
    content: body.content,
    createdAt: now,
    updatedAt: now,
  };

  return c.json({ ok: true, data: svc.createTemplate(tmpl) }, 201);
});

/**
 * `PUT /api/templates/:id`
 *
 * Updates a local template. Community templates cannot be edited.
 */
templates.put("/:id", async (c) => {
  const body = await c.req.json<Partial<Template>>();
  const updated = svc.updateTemplate(c.req.param("id"), body);
  if (!updated) {
    return c.json(
      { ok: false, error: "Template not found or not editable" },
      404
    );
  }
  return c.json({ ok: true, data: updated });
});

/**
 * `DELETE /api/templates/:id`
 *
 * Deletes a local template. Community templates cannot be deleted this way.
 */
templates.delete("/:id", (c) => {
  const ok = svc.deleteTemplate(c.req.param("id"));
  if (!ok) {
    return c.json(
      { ok: false, error: "Template not found or not deletable" },
      404
    );
  }
  return c.json({ ok: true, data: null });
});

/**
 * `POST /api/templates/sync`
 *
 * Downloads and caches community templates from a GitHub repo.
 * Accepts an optional `repoUrl` in the request body.
 */
templates.post("/sync", async (c) => {
  try {
    const body = await c.req.json<{ repoUrl?: string }>().catch(() => ({ repoUrl: undefined }));
    const result = await svc.syncCommunityTemplates(body.repoUrl);
    return c.json({ ok: true, data: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed";
    return c.json({ ok: false, error: msg }, 500);
  }
});

export default templates;
