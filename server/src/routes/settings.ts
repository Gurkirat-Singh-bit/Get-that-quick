// ── Settings routes — /api/settings ──────────────────────────────────────

import { Hono } from "hono";
import { getSettings, updateSettings } from "../services/config";
import { testProvider as testLLMProvider } from "../services/llm";
import type { AIProviderConfig } from "@shared/types";

const settings = new Hono();

// Get current settings (API keys are masked)
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

// Update settings (deep merge)
settings.put("/", async (c) => {
  const body = await c.req.json();

  // Prevent masked API keys from overwriting real ones
  if (body.ai?.providers) {
    const current = getSettings();
    for (const [name, provider] of Object.entries(body.ai.providers) as [string, any][]) {
      if (provider.apiKey && (provider.apiKey.includes("...") || provider.apiKey === "****")) {
        // Keep the existing key if the incoming one is masked
        provider.apiKey = current.ai.providers[name]?.apiKey ?? "";
      }
    }
  }

  const updated = updateSettings(body);
  return c.json({ ok: true, data: updated });
});

// Test LLM provider connection
settings.post("/test-provider", async (c) => {
  const body = await c.req.json<AIProviderConfig>();
  const result = await testLLMProvider(body);

  if (result.ok) {
    return c.json({ ok: true, data: { connected: true } });
  }
  return c.json({ ok: false, error: result.error }, 400);
});

export default settings;
