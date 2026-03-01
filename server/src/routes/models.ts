// ── Models routes — /api/models ──────────────────────────────────────────

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import * as svc from "../services/models";
import { getSettings, updateSettings } from "../services/config";

const models = new Hono();

/**
 * GET /api/models
 * List all models with download and active status.
 */
models.get("/", (c) => {
  const { stt } = getSettings();
  return c.json({ ok: true, data: svc.listModels(stt.activeModel) });
});

/**
 * POST /api/models/:id/download
 * Download a model with progress streaming via SSE.
 * Progress includes download speed and estimated time remaining.
 */
models.post("/:id/download", async (c) => {
  const id = c.req.param("id");
  const entry = svc.getManifestEntry(id);

  if (!entry) {
    return c.json({ ok: false, error: "Model not found in manifest" }, 404);
  }
  if (svc.isModelDownloaded(id)) {
    return c.json({ ok: false, error: "Model already downloaded" }, 409);
  }
  if (svc.isDownloading(id)) {
    return c.json({ ok: false, error: "Model is already downloading" }, 409);
  }

  return streamSSE(c, async (stream) => {
    try {
      await svc.downloadModel(entry, (progress) => {
        stream.writeSSE({
          data: JSON.stringify(progress),
        });
      });
      
      // Auto-activate if no model is currently active
      const settings = getSettings();
      if (!settings.stt.activeModel) {
        updateSettings({ stt: { ...settings.stt, activeModel: id } });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({ error: message }),
      });
    }
  });
});

/**
 * DELETE /api/models/:id/download
 * Cancel an active download.
 */
models.delete("/:id/download", (c) => {
  const id = c.req.param("id");
  const cancelled = svc.cancelDownload(id);
  
  if (!cancelled) {
    return c.json({ ok: false, error: "No active download found" }, 404);
  }
  
  return c.json({ ok: true, data: { cancelled: true } });
});

/**
 * DELETE /api/models/:id
 * Delete a downloaded model.
 */
models.delete("/:id", (c) => {
  const id = c.req.param("id");
  if (!svc.deleteModel(id)) {
    return c.json({ ok: false, error: "Model not found" }, 404);
  }

  // If deleted model was active, clear the setting
  const settings = getSettings();
  if (settings.stt.activeModel === id) {
    updateSettings({ stt: { ...settings.stt, activeModel: "" } });
  }

  return c.json({ ok: true, data: null });
});

// Activate a model
models.put("/:id/activate", (c) => {
  const id = c.req.param("id");
  if (!svc.isModelDownloaded(id)) {
    return c.json({ ok: false, error: "Model not downloaded" }, 400);
  }

  const settings = getSettings();
  updateSettings({ stt: { ...settings.stt, activeModel: id } });
  return c.json({ ok: true, data: { activeModel: id } });
});

export default models;
