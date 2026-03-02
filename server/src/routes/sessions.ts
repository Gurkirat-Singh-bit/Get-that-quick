/**
 * @fileoverview HTTP routes for chat session management.
 *
 * Handles creating, reading, updating, and deleting sessions.
 * Sessions are stored as JSON files on disk via the sessions service.
 *
 * Base path: `/api/sessions`
 *
 * @module routes/sessions
 * @license CC BY-NC 4.0 — {@link https://creativecommons.org/licenses/by-nc/4.0/}
 * @author Gurkirat Singh
 * @created 2026-02-25
 * @updated 2026-03-03
 */

import { Hono } from "hono";
import { nanoid } from "nanoid";
import * as svc from "../services/sessions";
import type { Session } from "@shared/types";

const sessions = new Hono();

/**
 * `GET /api/sessions`
 *
 * Returns metadata for all sessions, newest first.
 * Does not include message content to keep the response small.
 */
sessions.get("/", (c) => {
  const list = svc.listSessions();
  return c.json({ ok: true, data: list });
});

/**
 * `GET /api/sessions/:id`
 *
 * Returns a single session with its full message history.
 */
sessions.get("/:id", (c) => {
  const session = svc.getSession(c.req.param("id"));
  if (!session) return c.json({ ok: false, error: "Session not found" }, 404);
  return c.json({ ok: true, data: session });
});

/**
 * `POST /api/sessions`
 *
 * Creates a new empty session.
 * Accepts an optional `title` and `templateId` in the request body.
 */
sessions.post("/", async (c) => {
  const body = await c.req.json<{ title?: string; templateId?: string }>();
  const now = new Date().toISOString();

  const session: Session = {
    id: `sess_${nanoid(12)}`,
    title: body.title ?? "New Session",
    templateId: body.templateId ?? null,
    projectId: null,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };

  return c.json({ ok: true, data: svc.createSession(session) }, 201);
});

/**
 * `PUT /api/sessions/:id`
 *
 * Updates a session — title, messages, templateId, etc.
 * Sends back the updated session.
 */
sessions.put("/:id", async (c) => {
  const body = await c.req.json<Partial<Session>>();
  const updated = svc.updateSession(c.req.param("id"), body);
  if (!updated) return c.json({ ok: false, error: "Session not found" }, 404);
  return c.json({ ok: true, data: updated });
});

/**
 * `DELETE /api/sessions/:id`
 *
 * Permanently deletes a session and its messages.
 */
sessions.delete("/:id", (c) => {
  const ok = svc.deleteSession(c.req.param("id"));
  if (!ok) return c.json({ ok: false, error: "Session not found" }, 404);
  return c.json({ ok: true, data: null });
});

export default sessions;
