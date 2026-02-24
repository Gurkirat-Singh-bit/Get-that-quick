// ── Models routes — /api/models ──────────────────────────────────────────

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import * as svc from "../services/models";
import { getSettings, updateSettings } from "../services/config";

const models = new Hono();

// List all models (manifest + download/active status)
models.get("/", (c) => {
  const { stt } = getSettings();
  return c.json({ ok: true, data: svc.listModels(stt.activeModel) });
});

// Download a model (streams progress via SSE)
models.post("/:id/download", async (c) => {
  const id = c.req.param("id");
  const entry = svc.getManifestEntry(id);

  if (!entry) {
    return c.json({ ok: false, error: "Model not found in manifest" }, 404);
  }
  if (svc.isModelDownloaded(id)) {
    return c.json({ ok: false, error: "Model already downloaded" }, 409);
  }

  return streamSSE(c, async (stream) => {
    try {
      await svc.downloadModel(entry, (downloaded, total) => {
        stream.writeSSE({
          data: JSON.stringify({
            status: "downloading",
            downloaded,
            total,
            percent: total > 0 ? Math.round((downloaded / total) * 100) : 0,
          }),
        });
      });
      await stream.writeSSE({
        data: JSON.stringify({ status: "complete" }),
      });
    } catch (err: any) {
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({ error: err.message ?? String(err) }),
      });
    }
  });
});

// Delete a model
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
