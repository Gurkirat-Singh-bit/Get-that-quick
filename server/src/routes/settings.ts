/**
 * @fileoverview HTTP routes for application settings.
 *
 * Handles reading and writing all app settings including AI provider
 * configs (with key masking), STT model selection, and theme.
 * Also exposes a provider test endpoint.
 *
 * Base path: `/api/settings`
 *
 * @module routes/settings
 * @license CC BY-NC 4.0 — {@link https://creativecommons.org/licenses/by-nc/4.0/}
 * @author Gurkirat Singh
 * @created 2026-02-25
 * @updated 2026-03-03
 */

import { Hono } from "hono";
import { getSettings, updateSettings } from "../services/config";
import { testProvider as testLLMProvider } from "../services/llm";
import { SettingsSchema } from "@shared/schemas";
import type { AIProviderConfig } from "@shared/types";

const settings = new Hono();

/**
 * `GET /api/settings`
 *
 * Returns current settings. API keys are masked in the response
 * (first 4 + last 4 characters only).
 */
settings.get("/", (c) => {
  const s = structuredClone(getSettings());

  // Mask API keys: show first 4 + last 4 chars only
  for (const provider of Object.values(s.ai.providers)) {
    if (provider.apiKey && provider.apiKey.length > 8) {
      provider.apiKey =
        provider.apiKey.slice(0, 4) + "..." + provider.apiKey.slice(-4);
    } else if (provider.apiKey) {
      provider.apiKey = "****";
    }
  }

  return c.json({ ok: true, data: s });
});

/**
 * `PUT /api/settings`
 *
 * Deep-merges incoming settings into the current ones and saves.
 * Masked API keys in the request are ignored so real keys are not overwritten.
 */
settings.put("/", async (c) => {
  const rawBody = await c.req.json();
  
  // Validate with partial schema for updates
  const parseResult = SettingsSchema.partial().safeParse(rawBody);
  if (!parseResult.success) {
    return c.json({ 
      ok: false, 
      error: "Invalid settings update", 
      details: parseResult.error.format() 
    }, 400);
  }
  
  const body = parseResult.data;

  // Prevent masked API keys from overwriting real ones
  if (body.ai?.providers) {
    const current = getSettings();
    for (const [name, provider] of Object.entries(body.ai.providers)) {
      if (
        typeof provider === "object" &&
        provider !== null &&
        "apiKey" in provider &&
        typeof provider.apiKey === "string" &&
        (provider.apiKey.includes("...") || provider.apiKey === "****")
      ) {
        // Keep the existing key if the incoming one is masked
        provider.apiKey = current.ai.providers[name]?.apiKey ?? "";
      }
    }
  }

  const updated = updateSettings(body);
  return c.json({ ok: true, data: updated });
});

/**
 * `POST /api/settings/test-provider`
 *
 * Sends a small request to an AI provider to check if the config works.
 * Always returns HTTP 200 — the body's `ok` field signals success/failure.
 * Masked API keys are automatically restored from saved settings before testing.
 */
settings.post("/test-provider", async (c) => {
  const body = await c.req.json<AIProviderConfig>();

  // If the client sent a masked key, restore the real one from stored settings
  if (body.apiKey && (body.apiKey.includes("...") || body.apiKey === "****")) {
    const current = getSettings();
    const match = Object.values(current.ai.providers).find(
      (p) => p.baseUrl === body.baseUrl
    );
    if (match) body.apiKey = match.apiKey;
  }

  const result = await testLLMProvider(body);

  // Always 200 with ok:true — callers check data.connected, not HTTP status
  return c.json({
    ok: true,
    data: { connected: result.ok, error: result.error ?? null },
  });
});

export default settings;
