/**
 * @fileoverview HTTP route for cloud speech-to-text transcription.
 *
 * Accepts an audio file upload and forwards it to the configured
 * cloud STT provider (Groq Whisper or OpenAI Whisper).
 * The API key stays server-side; the browser never contacts the STT provider directly.
 *
 * Base path: `/api/stt`
 *
 * @module routes/stt
 * @license CC BY-NC 4.0 — {@link https://creativecommons.org/licenses/by-nc/4.0/}
 * @author Gurkirat Singh
 */

import { Hono } from "hono";
import { getSettings } from "../services/config";

const stt = new Hono();

/**
 * `POST /api/stt/transcribe`
 *
 * Accepts a multipart/form-data request with an `audio` file field.
 * Forwards to Groq or OpenAI Whisper depending on configured provider.
 * Returns the transcribed text.
 */
stt.post("/transcribe", async (c) => {
  const settings = getSettings();
  const provider = settings.stt.provider ?? "local";

  if (provider === "local") {
    return c.json({ ok: false, error: "Cloud STT not configured. Set STT provider to Groq or OpenAI Whisper in settings." }, 400);
  }

  const apiKey = settings.stt.cloudApiKey;
  if (!apiKey) {
    return c.json({ ok: false, error: `No API key configured for ${provider}. Add your API key in Settings → Voice.` }, 400);
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ ok: false, error: "Failed to parse audio upload." }, 400);
  }

  const audioFile = formData.get("audio");
  if (!audioFile || !(audioFile instanceof File)) {
    return c.json({ ok: false, error: "No audio file provided." }, 400);
  }

  // Enforce 25 MB size limit (Groq/OpenAI max)
  const MAX_SIZE = 25 * 1024 * 1024;
  if (audioFile.size > MAX_SIZE) {
    return c.json({ ok: false, error: `Audio file too large (${(audioFile.size / 1024 / 1024).toFixed(1)} MB). Maximum is 25 MB.` }, 400);
  }

  if (audioFile.size < 100) {
    return c.json({ ok: false, error: "Audio recording too short — no audio captured." }, 400);
  }

  const model = settings.stt.cloudModel || "whisper-large-v3-turbo";

  // Determine endpoint based on provider
  let baseUrl: string;
  if (provider === "groq") {
    baseUrl = "https://api.groq.com/openai/v1/audio/transcriptions";
  } else if (provider === "openai-whisper") {
    baseUrl = "https://api.openai.com/v1/audio/transcriptions";
  } else {
    return c.json({ ok: false, error: `Unknown STT provider: ${provider}` }, 400);
  }

  // Build forwarding request
  const outForm = new FormData();
  outForm.append("file", audioFile);
  outForm.append("model", model);
  outForm.append("response_format", "json");

  let res: Response;
  try {
    res = await fetch(baseUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: outForm,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ ok: false, error: `Network error calling STT provider: ${msg}` }, 502);
  }

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json() as { error?: { message?: string } };
      detail = body?.error?.message ?? "";
    } catch {}
    return c.json({ ok: false, error: `STT provider error (${res.status}): ${detail || res.statusText}` }, 502);
  }

  const result = await res.json() as { text?: string };
  const text = (result.text ?? "").trim();

  return c.json({ ok: true, data: { text } });
});

export default stt;
