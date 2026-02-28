// ── Templates service — CRUD for predefined LLM system prompts ───────────
//
// Templates are Markdown files with YAML frontmatter.
// Storage: ~/.getthatquick/templates/local/<category>/<subcategory>/.../*.md
//          ~/.getthatquick/templates/community/<category>/.../*.md
//
// Categories are hierarchical — the category string uses "/" as a separator
// (e.g. "code/frontend") and maps to subdirectories on disk.
// Legacy flat templates (no category subdirectory) are still supported.

import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  unlinkSync,
  statSync,
  mkdirSync,
} from "node:fs";
import { join, relative } from "node:path";
import matter from "gray-matter";
import {
  getLocalTemplatesDir,
  getCommunityTemplatesDir,
} from "../lib/paths";
import type { Template, TemplateMeta } from "@shared/types";

// ── Read ──────────────────────────────────────────────────────────────────

/** List all templates (local + community). Returns metadata only. */
export function listTemplates(): TemplateMeta[] {
  const local = readDirRecursive(getLocalTemplatesDir(), "local");
  const community = readDirRecursive(getCommunityTemplatesDir(), "community");
  return [...local, ...community].sort((a, b) =>
    a.title.localeCompare(b.title)
  );
}

/** Get a single template by ID. Searches local first, then community. */
export function getTemplate(id: string): Template | null {
  return (
    findRecursive(getLocalTemplatesDir(), id, "local") ??
    findRecursive(getCommunityTemplatesDir(), id, "community")
  );
}

// ── Write (local only) ───────────────────────────────────────────────────

/** Create a new local template. Uses its category to determine subdirectory. */
export function createTemplate(tmpl: Template): Template {
  const categoryDir = tmpl.category
    ? join(getLocalTemplatesDir(), ...tmpl.category.split("/").filter(Boolean))
    : getLocalTemplatesDir();

  if (!existsSync(categoryDir)) {
    mkdirSync(categoryDir, { recursive: true });
  }

  writeToDisk(join(categoryDir, `${tmpl.id}.md`), tmpl);
  return tmpl;
}

/** Update an existing local template (community templates are read-only). */
export function updateTemplate(
  id: string,
  updates: Partial<Template>
): Template | null {
  const found = findRecursiveWithPath(getLocalTemplatesDir(), id, "local");
  if (!found) return null;

  const { template: existing, filePath: oldPath } = found;

  const merged: Template = {
    ...existing,
    ...updates,
    id, // never overwrite ID
    source: "local",
    updatedAt: new Date().toISOString(),
  };

  // If category changed, move to new directory
  const oldCategory = existing.category || "";
  const newCategory = merged.category || "";

  if (oldCategory !== newCategory) {
    // Delete from old location
    if (existsSync(oldPath)) unlinkSync(oldPath);

    // Write to new category directory
    const categoryDir = newCategory
      ? join(getLocalTemplatesDir(), ...newCategory.split("/").filter(Boolean))
      : getLocalTemplatesDir();

    if (!existsSync(categoryDir)) {
      mkdirSync(categoryDir, { recursive: true });
    }

    writeToDisk(join(categoryDir, `${id}.md`), merged);
  } else {
    writeToDisk(oldPath, merged);
  }

  return merged;
}

/** Delete a local template. Returns true if it existed. */
export function deleteTemplate(id: string): boolean {
  const found = findRecursiveWithPath(getLocalTemplatesDir(), id, "local");
  if (!found) return false;
  unlinkSync(found.filePath);
  return true;
}

/** List all categories found across local and community templates. */
export function listCategories(): string[] {
  const all = listTemplates();
  const cats = new Set<string>();
  for (const t of all) {
    if (t.category) cats.add(t.category);
  }
  return Array.from(cats).sort();
}

// ── Internal helpers ──────────────────────────────────────────────────────

/** Recursively read all .md files in a directory tree. */
function readDirRecursive(
  dir: string,
  source: Template["source"]
): TemplateMeta[] {
  if (!existsSync(dir)) return [];
  const list: TemplateMeta[] = [];

  function walk(currentDir: string) {
    const entries = readdirSync(currentDir);
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (entry.endsWith(".md")) {
        try {
          const tmpl = readFile(fullPath, source, dir);
          if (tmpl) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { content: _, ...meta } = tmpl;
            list.push(meta);
          }
        } catch {
          // skip corrupt files
        }
      }
    }
  }

  walk(dir);
  return list;
}

/** Read a single template file. Infers category from directory path if not in frontmatter. */
function readFile(
  filePath: string,
  source: Template["source"],
  rootDir?: string
): Template | null {
  try {
    const raw = readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);

    // Infer category from the relative directory path if not set in YAML
    let category = data.category ?? "";
    if (!category && rootDir) {
      const dir = filePath.substring(0, filePath.lastIndexOf("/"));
      const rel = relative(rootDir, dir);
      if (rel) category = rel;
    }

    return {
      id: data.id ?? "",
      title: data.title ?? "",
      description: data.description ?? "",
      category,
      tags: data.tags ?? [],
      source,
      content: content.trim(),
      author: data.author,
      version: data.version,
      variables: data.variables,
      createdAt: data.createdAt ?? new Date().toISOString(),
      updatedAt: data.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Recursively find a template by ID and return it. */
function findRecursive(
  dir: string,
  id: string,
  source: Template["source"]
): Template | null {
  const result = findRecursiveWithPath(dir, id, source);
  return result?.template ?? null;
}

/** Recursively find a template by ID and return both template and file path. */
function findRecursiveWithPath(
  dir: string,
  id: string,
  source: Template["source"]
): { template: Template; filePath: string } | null {
  if (!existsSync(dir)) return null;

  // Check direct file first (fast path)
  const directPath = join(dir, `${id}.md`);
  if (existsSync(directPath)) {
    const tmpl = readFile(directPath, source, dir);
    if (tmpl) return { template: tmpl, filePath: directPath };
  }

  // Recurse into subdirectories
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      const result = findRecursiveWithPath(fullPath, id, source);
      if (result) return result;
    }
  }

  return null;
}

function writeToDisk(filePath: string, tmpl: Template): void {
  const frontmatter: Record<string, unknown> = {
    id: tmpl.id,
    title: tmpl.title,
    description: tmpl.description,
    category: tmpl.category,
    tags: tmpl.tags,
    createdAt: tmpl.createdAt,
    updatedAt: tmpl.updatedAt,
  };
  if (tmpl.author) frontmatter.author = tmpl.author;
  if (tmpl.version) frontmatter.version = tmpl.version;
  if (tmpl.variables) frontmatter.variables = tmpl.variables;

  const md = matter.stringify(tmpl.content, frontmatter);
  writeFileSync(filePath, md, "utf-8");
}
