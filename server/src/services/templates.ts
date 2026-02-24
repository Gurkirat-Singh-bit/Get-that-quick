// ── Templates service — CRUD for predefined LLM system prompts ───────────
//
// Templates are Markdown files with YAML frontmatter.
// Storage: ~/.getthatquick/templates/local/*.md   (user-created)
//          ~/.getthatquick/templates/community/*.md (remote repo, P2)
//
// The markdown body IS the system prompt — no variable interpolation.

import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import {
  getLocalTemplatesDir,
  getCommunityTemplatesDir,
} from "../lib/paths";
import type { Template, TemplateMeta } from "@shared/types";

// ── Read ──────────────────────────────────────────────────────────────────

/** List all templates (local + community). Returns metadata only. */
export function listTemplates(): TemplateMeta[] {
  const local = readDir(getLocalTemplatesDir(), "local");
  const community = readDir(getCommunityTemplatesDir(), "community");
  return [...local, ...community].sort((a, b) =>
    a.title.localeCompare(b.title)
  );
}

/** Get a single template by ID. Searches local first, then community. */
export function getTemplate(id: string): Template | null {
  return (
    findInDir(getLocalTemplatesDir(), id, "local") ??
    findInDir(getCommunityTemplatesDir(), id, "community")
  );
}

// ── Write (local only) ───────────────────────────────────────────────────

/** Create a new local template. */
export function createTemplate(tmpl: Template): Template {
  writeToDisk(join(getLocalTemplatesDir(), `${tmpl.id}.md`), tmpl);
  return tmpl;
}

/** Update an existing local template (community templates are read-only). */
export function updateTemplate(
  id: string,
  updates: Partial<Template>
): Template | null {
  const filePath = join(getLocalTemplatesDir(), `${id}.md`);
  if (!existsSync(filePath)) return null;

  const existing = readFile(filePath, "local");
  if (!existing) return null;

  const merged: Template = {
    ...existing,
    ...updates,
    id, // never overwrite ID
    source: "local",
    updatedAt: new Date().toISOString(),
  };
  writeToDisk(filePath, merged);
  return merged;
}

/** Delete a local template. Returns true if it existed. */
export function deleteTemplate(id: string): boolean {
  const filePath = join(getLocalTemplatesDir(), `${id}.md`);
  if (!existsSync(filePath)) return false;
  unlinkSync(filePath);
  return true;
}

// ── Internal helpers ──────────────────────────────────────────────────────

function readDir(
  dir: string,
  source: Template["source"]
): TemplateMeta[] {
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  const list: TemplateMeta[] = [];

  for (const file of files) {
    try {
      const tmpl = readFile(join(dir, file), source);
      if (tmpl) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { content: _, ...meta } = tmpl;
        list.push(meta);
      }
    } catch {
      // skip corrupt files
    }
  }
  return list;
}

function readFile(
  filePath: string,
  source: Template["source"]
): Template | null {
  try {
    const raw = readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);
    return {
      id: data.id ?? "",
      title: data.title ?? "",
      description: data.description ?? "",
      category: data.category ?? "",
      tags: data.tags ?? [],
      source,
      content: content.trim(),
      createdAt: data.createdAt ?? new Date().toISOString(),
      updatedAt: data.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function findInDir(
  dir: string,
  id: string,
  source: Template["source"]
): Template | null {
  const filePath = join(dir, `${id}.md`);
  if (!existsSync(filePath)) return null;
  return readFile(filePath, source);
}

function writeToDisk(filePath: string, tmpl: Template): void {
  const frontmatter = {
    id: tmpl.id,
    title: tmpl.title,
    description: tmpl.description,
    category: tmpl.category,
    tags: tmpl.tags,
    createdAt: tmpl.createdAt,
    updatedAt: tmpl.updatedAt,
  };
  const md = matter.stringify(tmpl.content, frontmatter);
  writeFileSync(filePath, md, "utf-8");
}
