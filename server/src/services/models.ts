// ── Models service — download / extract / manage Vosk models ─────────────
//
// Model manifest is bundled at server/models.json.
// Models download to ~/.getthatquick/models/<model-id>/

import { existsSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { getModelsDir } from "../lib/paths";
import type { VoskModelManifest, VoskModelInfo } from "@shared/types";

// Load bundled manifest (resolved via tsconfig resolveJsonModule)
import manifestJson from "../../models.json";
const manifest = manifestJson as VoskModelManifest[];

// ── Queries ───────────────────────────────────────────────────────────────

/** List all models from the manifest with download & active status. */
export function listModels(activeModelId: string): VoskModelInfo[] {
  const dir = getModelsDir();
  return manifest.map((m) => ({
    ...m,
    downloaded: existsSync(join(dir, m.id)),
    active: m.id === activeModelId,
  }));
}

/** Check if a specific model is downloaded. */
export function isModelDownloaded(id: string): boolean {
  return existsSync(join(getModelsDir(), id));
}

/** Absolute path to a model directory. */
export function getModelPath(id: string): string {
  return join(getModelsDir(), id);
}

/** Find a model entry in the manifest. */
export function getManifestEntry(id: string): VoskModelManifest | undefined {
  return manifest.find((m) => m.id === id);
}

// ── Download ──────────────────────────────────────────────────────────────

/**
 * Download and extract a Vosk model.
 * Calls `onProgress` periodically with bytes downloaded and total size.
 */
export async function downloadModel(
  model: VoskModelManifest,
  onProgress?: (downloaded: number, total: number) => void
): Promise<void> {
  const modelsDir = getModelsDir();
  const targetDir = join(modelsDir, model.id);
  const zipPath = join(modelsDir, `${model.id}.zip`);

  // ── Download ──
  const response = await fetch(model.url);
  if (!response.ok) {
    throw new Error(
      `Download failed: ${response.status} ${response.statusText}`
    );
  }

  const total = Number(response.headers.get("content-length") ?? 0);
  let downloaded = 0;

  const writer = Bun.file(zipPath).writer();
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    writer.write(value);
    downloaded += value.length;
    onProgress?.(downloaded, total);
  }
  await writer.end();

  // ── Extract ──
  mkdirSync(modelsDir, { recursive: true });

  const proc = Bun.spawn(["unzip", "-o", zipPath, "-d", modelsDir], {
    stdout: "ignore",
    stderr: "pipe",
  });
  await proc.exited;

  if (proc.exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    rmSync(zipPath, { force: true });
    throw new Error(`Extraction failed: ${stderr}`);
  }

  // Clean up zip
  rmSync(zipPath, { force: true });

  // Verify the model directory was created
  if (!existsSync(targetDir)) {
    throw new Error(
      `Model directory not found after extraction: ${targetDir}`
    );
  }
}

// ── Delete ────────────────────────────────────────────────────────────────

/** Remove a downloaded model from disk. Returns true if it existed. */
export function deleteModel(id: string): boolean {
  const dir = join(getModelsDir(), id);
  if (!existsSync(dir)) return false;
  rmSync(dir, { recursive: true, force: true });
  return true;
}
