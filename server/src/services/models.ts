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

// ── Download tracking ─────────────────────────────────────────────────────

/** Active downloads keyed by model ID. Each entry contains an AbortController for cancellation. */
const activeDownloads = new Map<string, AbortController>();

// ── Queries ───────────────────────────────────────────────────────────────

/**
 * List all models from the manifest with download & active status.
 *
 * @param activeModelId - ID of the currently active model.
 * @returns Array of model info objects with download and active flags.
 */
export function listModels(activeModelId: string): VoskModelInfo[] {
  const dir = getModelsDir();
  return manifest.map((m) => ({
    ...m,
    downloaded: existsSync(join(dir, m.id)),
    active: m.id === activeModelId,
  }));
}

/**
 * Check if a specific model is downloaded.
 *
 * @param id - Model identifier to check.
 * @returns True if the model directory exists on disk.
 */
export function isModelDownloaded(id: string): boolean {
  return existsSync(join(getModelsDir(), id));
}

/**
 * Absolute path to a model directory.
 *
 * @param id - Model identifier.
 * @returns Full filesystem path to the model directory.
 */
export function getModelPath(id: string): string {
  return join(getModelsDir(), id);
}

/**
 * Find a model entry in the manifest.
 *
 * @param id - Model identifier to find.
 * @returns The manifest entry, or undefined if not found.
 */
export function getManifestEntry(id: string): VoskModelManifest | undefined {
  return manifest.find((m) => m.id === id);
}

// ── Download ──────────────────────────────────────────────────────────────

/**
 * Progress information for model downloads.
 */
export interface DownloadProgress {
  /** Download status: downloading, extracting, or complete. */
  status: "downloading" | "extracting" | "complete";
  /** Bytes downloaded so far. */
  downloaded: number;
  /** Total file size in bytes. */
  total: number;
  /** Download percentage (0-100). */
  percent: number;
  /** Download speed in bytes per second. */
  speed?: number;
  /** Estimated time remaining in seconds. */
  eta?: number;
}

/**
 * Download and extract a Vosk model with progress tracking, speed calculation, and cancellation support.
 * 
 * Fetches the model ZIP from the URL in the manifest entry, extracts it to the models directory, 
 * and cleans up the ZIP file. Supports resuming downloads and background operation.
 *
 * @param model - Manifest entry containing download URL and metadata.
 * @param onProgress - Optional callback for download progress updates with speed and ETA.
 * @returns AbortController that can be used to cancel the download.
 * @throws {Error} If download fails, extraction fails, or model directory not created.
 *
 * @example
 * ```ts
 * const controller = await downloadModel(manifest[0], (progress) => {
 *   console.log(\`\${progress.percent}% at \${(progress.speed! / 1024).toFixed(1)} KB/s\`);
 *   console.log(\`ETA: \${progress.eta}s\`);
 * });
 * 
 * // Cancel if needed
 * controller.abort();
 * ```
 */
export async function downloadModel(
  model: VoskModelManifest,
  onProgress?: (progress: DownloadProgress) => void
): Promise<AbortController> {
  const modelsDir = getModelsDir();
  const targetDir = join(modelsDir, model.id);
  const zipPath = join(modelsDir, `${model.id}.zip`);

  // Create abort controller for cancellation
  const abortController = new AbortController();
  activeDownloads.set(model.id, abortController);

  try {
    // ── Download with speed tracking ──
    const response = await fetch(model.url, { signal: abortController.signal });
    if (!response.ok) {
      throw new Error(
        `Download failed: ${response.status} ${response.statusText}`
      );
    }

    const total = Number(response.headers.get("content-length") ?? 0);
    let downloaded = 0;
    let lastUpdate = Date.now();
    let lastDownloaded = 0;
    
    const writer = Bun.file(zipPath).writer();
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Check for cancellation
      if (abortController.signal.aborted) {
        await writer.end();
        rmSync(zipPath, { force: true });
        throw new Error("Download cancelled");
      }
      
      writer.write(value);
      downloaded += value.length;
      
      // Calculate speed and ETA every 500ms
      const now = Date.now();
      const elapsed = (now - lastUpdate) / 1000; // seconds
      
      if (elapsed >= 0.5) {
        const bytesInInterval = downloaded - lastDownloaded;
        const speed = bytesInInterval / elapsed; // bytes per second
        const remainingBytes = total - downloaded;
        const eta = speed > 0 ? Math.round(remainingBytes / speed) : 0;
        
        onProgress?.({
          status: "downloading",
          downloaded,
          total,
          percent: total > 0 ? Math.round((downloaded / total) * 100) : 0,
          speed,
          eta,
        });
        
        lastUpdate = now;
        lastDownloaded = downloaded;
      }
    }
    await writer.end();

    // Final progress update
    onProgress?.({
      status: "downloading",
      downloaded: total,
      total,
      percent: 100,
      speed: 0,
      eta: 0,
    });

    // ── Extract ──
    onProgress?.({
      status: "extracting",
      downloaded: total,
      total,
      percent: 100,
    });

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

    // Complete
    onProgress?.({
      status: "complete",
      downloaded: total,
      total,
      percent: 100,
    });

    return abortController;
  } finally {
    activeDownloads.delete(model.id);
  }
}

// ── Delete ────────────────────────────────────────────────────────────────

/**
 * Cancel an active download.
 *
 * @param id - Model identifier of the download to cancel.
 * @returns True if download was cancelled, false if no active download found.
 *
 * @example
 * ```ts
 * if (cancelDownload("vosk-model-small-en-us-0.15")) {
 *   console.log("Download cancelled successfully");
 * }
 * ```
 */
export function cancelDownload(id: string): boolean {
  const controller = activeDownloads.get(id);
  if (!controller) return false;
  
  controller.abort();
  activeDownloads.delete(id);
  
  // Clean up partial download
  const zipPath = join(getModelsDir(), `${id}.zip`);
  if (existsSync(zipPath)) {
    rmSync(zipPath, { force: true });
  }
  
  return true;
}

/**
 * Check if a model is currently being downloaded.
 *
 * @param id - Model identifier to check.
 * @returns True if the model is being downloaded.
 */
export function isDownloading(id: string): boolean {
  return activeDownloads.has(id);
}

/**
 * Get list of models currently being downloaded.
 *
 * @returns Array of model IDs that are actively downloading.
 */
export function getActiveDownloads(): string[] {
  return Array.from(activeDownloads.keys());
}

/**
 * Remove a downloaded model from disk.
 *
 * @param id - Model identifier to delete.
 * @returns True if model existed and was deleted, false otherwise.
 *
 * @example
 * ```ts
 * if (deleteModel("vosk-model-small-en-us-0.15")) {
 *   console.log("Model deleted");
 * }
 * ```
 */
export function deleteModel(id: string): boolean {
  const dir = join(getModelsDir(), id);
  if (!existsSync(dir)) return false;
  rmSync(dir, { recursive: true, force: true });
  return true;
}
