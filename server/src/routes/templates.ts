// ── Templates routes — /api/templates ────────────────────────────────────

import { Hono } from "hono";
import { nanoid } from "nanoid";
import * as svc from "../services/templates";
import type { Template } from "@shared/types";

const templates = new Hono();

// List all templates (local + community, metadata only)
templates.get("/", (c) => {
  return c.json({ ok: true, data: svc.listTemplates() });
});

// Get single template (full content)
templates.get("/:id", (c) => {
  const tmpl = svc.getTemplate(c.req.param("id"));
  if (!tmpl) return c.json({ ok: false, error: "Template not found" }, 404);
  return c.json({ ok: true, data: tmpl });
});

// Create local template
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

// Update local template
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

// Delete local template
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

export default templates;
