// ── Sessions routes — /api/sessions ──────────────────────────────────────

import { Hono } from "hono";
import { nanoid } from "nanoid";
import * as svc from "../services/sessions";
import type { Session } from "@shared/types";

const sessions = new Hono();

// List all sessions (metadata only, newest first)
sessions.get("/", (c) => {
  const list = svc.listSessions();
  return c.json({ ok: true, data: list });
});

// Get single session with full message history
sessions.get("/:id", (c) => {
  const session = svc.getSession(c.req.param("id"));
  if (!session) return c.json({ ok: false, error: "Session not found" }, 404);
  return c.json({ ok: true, data: session });
});

// Create new session
sessions.post("/", async (c) => {
  const body = await c.req.json<{ title?: string; templateId?: string }>();
  const now = new Date().toISOString();

  const session: Session = {
    id: `sess_${nanoid(12)}`,
    title: body.title ?? "New Session",
    templateId: body.templateId ?? null,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };

  return c.json({ ok: true, data: svc.createSession(session) }, 201);
});

// Update session (title, messages, templateId, etc.)
sessions.put("/:id", async (c) => {
  const body = await c.req.json<Partial<Session>>();
  const updated = svc.updateSession(c.req.param("id"), body);
  if (!updated) return c.json({ ok: false, error: "Session not found" }, 404);
  return c.json({ ok: true, data: updated });
});

// Delete session
sessions.delete("/:id", (c) => {
  const ok = svc.deleteSession(c.req.param("id"));
  if (!ok) return c.json({ ok: false, error: "Session not found" }, 404);
  return c.json({ ok: true, data: null });
});

export default sessions;
