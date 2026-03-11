---
sidebar_position: 8
---

# GitHub Copilot Auth API

**Base path:** `/api/auth`

OAuth device flow integration for GitHub Copilot. Allows users with a GitHub Copilot subscription to access top-tier models (Claude Sonnet 4.5/4.6, GPT-4.1, Gemini 2.5 Pro) without separate API keys.

:::info
This uses the GitHub OAuth device authorization grant flow (RFC 8628). The connection is stored as a standard provider in `settings.json` and works transparently with the `/api/generate` endpoint.
:::

---

## Flow Overview

```
1. POST /api/auth/copilot/start   → get device_code + user_code
2. User visits github.com/login/device, enters user_code
3. POST /api/auth/copilot/poll    → poll until authorized
4. On success: "github-copilot" provider saved in settings
5. Use like any other provider via /api/generate
```

---

## POST `/api/auth/copilot/start`

Start the GitHub OAuth device flow. Returns the code the user needs to enter on GitHub.

### Response

```json
{
  "ok": true,
  "data": {
    "deviceCode": "068a3049...",
    "userCode": "B5D7-1271",
    "verificationUri": "https://github.com/login/device",
    "interval": 5,
    "expiresIn": 899
  }
}
```

| Field | Description |
|-------|-------------|
| `deviceCode` | Server-side code used to poll for authorization |
| `userCode` | The 8-character code the user enters on GitHub |
| `verificationUri` | URL to visit: `https://github.com/login/device` |
| `interval` | Minimum seconds between poll requests |
| `expiresIn` | Seconds until the code expires (~15 minutes) |

---

## POST `/api/auth/copilot/poll`

Poll GitHub to check if the user has authorized. Call this every `interval` seconds until `ok: true` or a non-pending error.

### Request

```json
{
  "deviceCode": "068a3049...",
  "providerName": "github-copilot"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `deviceCode` | Yes | The device_code from `/start` |
| `providerName` | No | Provider name to save as (default: `"github-copilot"`) |

### Response — Authorized

```json
{
  "ok": true,
  "data": {
    "connected": true,
    "providerName": "github-copilot"
  }
}
```

### Response — Still Waiting

```json
{
  "ok": false,
  "pending": true,
  "error": "Waiting for authorization"
}
```

### Response — Slow Down

```json
{
  "ok": false,
  "pending": true,
  "slowDown": true
}
```

When `slowDown: true`, increase your polling interval by 5 seconds.

### Response — Error

```json
{
  "ok": false,
  "error": "Authorization code expired. Please start again."
}
```

---

## GET `/api/auth/copilot/status`

Check if a GitHub Copilot provider is currently connected.

### Response — Connected

```json
{
  "ok": true,
  "data": {
    "connected": true,
    "providerName": "github-copilot",
    "model": "claude-sonnet-4.5"
  }
}
```

### Response — Not Connected

```json
{
  "ok": true,
  "data": {
    "connected": false
  }
}
```

---

## POST `/api/auth/copilot/disconnect`

Remove the GitHub Copilot provider from settings and revoke the stored token.

### Response

```json
{
  "ok": true,
  "data": {
    "disconnected": true
  }
}
```

---

## Token Management

The OAuth flow stores a long-lived GitHub OAuth token (`gho_...`) as the provider's `apiKey`. The server automatically exchanges this for a short-lived Copilot API token before each request, caching it with a 5-minute expiry buffer.

**You never need to refresh tokens manually.** The server handles it transparently.

---

## Available Models

After connecting, select a model in Settings → Models & LLM → github-copilot provider. Common model IDs:

| Model ID | Provider | Notes |
|----------|----------|-------|
| `claude-sonnet-4.5` | Anthropic | Recommended for coding |
| `claude-sonnet-4.6` | Anthropic | Latest Claude Sonnet |
| `claude-opus-4.5` | Anthropic | Most capable |
| `gpt-4.1` | OpenAI | Latest GPT |
| `gpt-4o` | OpenAI | Fast GPT-4 |
| `gemini-2.5-pro` | Google | Best for long context |

:::tip
Use `GET /api/generate/models/github-copilot` to fetch the live list of models available on your Copilot subscription.
:::

---

## Eligibility

GitHub Copilot integration works with:
- **GitHub Copilot Individual** (paid)
- **GitHub Copilot Pro** (included in GitHub Pro)
- **GitHub Copilot for Students** (via GitHub Education / Student Developer Pack — free)
- **GitHub Copilot Business/Enterprise** (may have org restrictions)

:::warning
This uses GitHub's internal Copilot API via the OAuth device flow — the same mechanism used by VS Code, Neovim, and other editor plugins. It is not an officially documented public API. Use within the terms of your GitHub Copilot subscription.
:::
