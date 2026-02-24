// ── Sessions service — CRUD for chat sessions (JSON files) ───────────────
//
// Storage: ~/.getthatquick/prompts/<session-id>.json

import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { getPromptsDir } from "../lib/paths";
import type { Session, SessionMeta } from "@shared/types";

// ── Read ──────────────────────────────────────────────────────────────────

/** List all sessions (metadata only, newest first). */
export function listSessions(): SessionMeta[] {
  const dir = getPromptsDir();
  if (!existsSync(dir)) return [];

  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const list: SessionMeta[] = [];

  for (const file of files) {
    try {
      const raw = readFileSync(join(dir, file), "utf-8");
      const s: Session = JSON.parse(raw);
      list.push({
        id: s.id,
        title: s.title,
        templateId: s.templateId,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        messageCount: s.messages.length,
      });
    } catch {
      // skip corrupt / unreadable files
    }
  }

  return list.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/** Get a single session with all messages. */
export function getSession(id: string): Session | null {
  const path = sessionPath(id);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

// ── Write ─────────────────────────────────────────────────────────────────

/** Create a new session on disk. */
export function createSession(session: Session): Session {
  writeFileSync(
    sessionPath(session.id),
    JSON.stringify(session, null, 2),
    "utf-8"
  );
  return session;
}

/** Merge partial updates into an existing session, bump updatedAt. */
export function updateSession(
  id: string,
  updates: Partial<Session>
): Session | null {
  const existing = getSession(id);
  if (!existing) return null;

  const updated: Session = {
    ...existing,
    ...updates,
    id, // never overwrite ID
    updatedAt: new Date().toISOString(),
  };

  writeFileSync(sessionPath(id), JSON.stringify(updated, null, 2), "utf-8");
  return updated;
}

/** Delete a session file. Returns true if it existed. */
export function deleteSession(id: string): boolean {
  const path = sessionPath(id);
  if (!existsSync(path)) return false;
  unlinkSync(path);
  return true;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function sessionPath(id: string): string {
  return join(getPromptsDir(), `${id}.json`);
}
