/**
 * @fileoverview GitHub Copilot OAuth device flow routes.
 *
 * Implements the GitHub device authorization flow so the user can
 * connect their GitHub Copilot subscription to GetThatQuick.
 *
 * Flow:
 *  1. POST /api/auth/copilot/start  — request device code
 *  2. User visits GitHub to authorize
 *  3. POST /api/auth/copilot/poll   — poll until authorized, then save token
 *  4. GET  /api/auth/copilot/status — check connection status
 *  5. POST /api/auth/copilot/disconnect — remove stored token
 *
 * Base path: `/api/auth`
 *
 * @module routes/auth
 * @license CC BY-NC 4.0 — {@link https://creativecommons.org/licenses/by-nc/4.0/}
 * @author Gurkirat Singh
 */

import { Hono } from "hono";
import { getSettings, updateSettings } from "../services/config";

const auth = new Hono();

/**
 * The VS Code Copilot extension client ID used for the OAuth device flow.
 * This is the same client ID used by the official VS Code Copilot extension
 * and widely used community tools (neovim-copilot, copilot-proxy, etc.).
 */
const COPILOT_CLIENT_ID = "Iv1.b507a08c87ecfe98";

/** Base URL for the GitHub Copilot API (OpenAI-compatible). */
const COPILOT_BASE_URL = "https://api.githubcopilot.com";

/**
 * `POST /api/auth/copilot/start`
 *
 * Starts the GitHub OAuth device flow.
 * Returns the user_code the user needs to enter at github.com/login/device.
 */
auth.post("/copilot/start", async (c) => {
  try {
    const res = await fetch("https://github.com/login/device/code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "GitHubCopilotChat/0.22.4",
      },
      body: JSON.stringify({
        client_id: COPILOT_CLIENT_ID,
        scope: "copilot",
      }),
    });

    if (!res.ok) {
      return c.json({ ok: false, error: `GitHub returned ${res.status}` }, 502);
    }

    const data = await res.json() as {
      device_code: string;
      user_code: string;
      verification_uri: string;
      interval: number;
      expires_in: number;
    };

    return c.json({
      ok: true,
      data: {
        deviceCode: data.device_code,
        userCode: data.user_code,
        verificationUri: data.verification_uri,
        interval: data.interval,
        expiresIn: data.expires_in,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ ok: false, error: `Failed to start GitHub auth: ${msg}` }, 502);
  }
});

/**
 * `POST /api/auth/copilot/poll`
 *
 * Polls GitHub to check if the user has authorized.
 * If authorized, saves the GitHub OAuth token to settings as the
 * "github-copilot" provider and returns success.
 */
auth.post("/copilot/poll", async (c) => {
  const body = await c.req.json<{ deviceCode: string; providerName?: string }>();
  const { deviceCode, providerName = "github-copilot" } = body;

  if (!deviceCode) {
    return c.json({ ok: false, error: "deviceCode is required" }, 400);
  }

  // Validate providerName to prevent prototype pollution
  if (!/^[a-zA-Z0-9_-]+$/.test(providerName)) {
    return c.json({ ok: false, error: "Invalid provider name" }, 400);
  }

  try {
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "GitHubCopilotChat/0.22.4",
      },
      body: JSON.stringify({
        client_id: COPILOT_CLIENT_ID,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });

    if (!res.ok) {
      return c.json({ ok: false, error: `GitHub returned ${res.status}` }, 502);
    }

    const data = await res.json() as {
      access_token?: string;
      token_type?: string;
      error?: string;
      error_description?: string;
    };

    if (data.error === "authorization_pending") {
      return c.json({ ok: false, pending: true, error: "Waiting for authorization" });
    }

    if (data.error === "slow_down") {
      return c.json({ ok: false, pending: true, slowDown: true, error: "Slow down polling" });
    }

    if (data.error === "expired_token") {
      return c.json({ ok: false, error: "Authorization code expired. Please start again." });
    }

    if (data.error || !data.access_token) {
      return c.json({ ok: false, error: data.error_description || data.error || "Authorization failed" });
    }

    // Success — save the GitHub token as the Copilot provider's API key
    const settings = getSettings();
    const currentProviders = settings.ai.providers;
    const updatedProviders = {
      ...currentProviders,
      [providerName]: {
        apiKey: data.access_token,
        model: currentProviders[providerName]?.model || "claude-sonnet-4.5",
        baseUrl: COPILOT_BASE_URL,
      },
    };

    // Set as active provider if no provider is currently configured
    const newActive = settings.ai.provider || providerName;
    updateSettings({
      ai: {
        ...settings.ai,
        provider: newActive,
        providers: updatedProviders,
      },
    });

    return c.json({ ok: true, data: { connected: true, providerName } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ ok: false, error: `Poll failed: ${msg}` }, 502);
  }
});

/**
 * `GET /api/auth/copilot/status`
 *
 * Returns whether a GitHub Copilot provider is currently connected.
 */
auth.get("/copilot/status", (c) => {
  const settings = getSettings();
  const copilotProvider = Object.entries(settings.ai.providers).find(
    ([, config]) => config.baseUrl === COPILOT_BASE_URL
  );

  if (copilotProvider) {
    return c.json({
      ok: true,
      data: { connected: true, providerName: copilotProvider[0], model: copilotProvider[1].model },
    });
  }

  return c.json({ ok: true, data: { connected: false } });
});

/**
 * `POST /api/auth/copilot/disconnect`
 *
 * Removes the GitHub Copilot provider from settings.
 */
auth.post("/copilot/disconnect", async (c) => {
  const settings = getSettings();
  const updated = { ...settings.ai.providers };

  let removed = false;
  for (const [name, config] of Object.entries(updated)) {
    if (config.baseUrl === COPILOT_BASE_URL) {
      delete updated[name];
      removed = true;
    }
  }

  if (!removed) {
    return c.json({ ok: true, data: { disconnected: false } });
  }

  const newActive = settings.ai.provider && updated[settings.ai.provider]
    ? settings.ai.provider
    : Object.keys(updated)[0] || "";

  updateSettings({
    ai: {
      ...settings.ai,
      provider: newActive,
      providers: updated,
    },
  });

  return c.json({ ok: true, data: { disconnected: true } });
});

export default auth;
