---
sidebar_position: 5
---

# GitHub Copilot Integration

Connect your **GitHub Copilot subscription** to GetThatQuick and get free access to top-tier models — Claude Sonnet 4.5/4.6, Claude Opus 4.5/4.6, GPT-4.1, Gemini 2.5 Pro, and more.

:::tip Who can use this?
- **GitHub Copilot Individual** (paid, $10/month)
- **GitHub Pro** users (Copilot included)
- **Students** with [GitHub Education](https://education.github.com) / Student Developer Pack — **completely free**
- GitHub Copilot Business/Enterprise (may depend on org settings)
:::

---

## Setup

### 1. Connect your account

1. Open **Settings → Models & LLM**
2. At the top, click **Connect GitHub Copilot**
3. A code like `B5D7-1271` appears

### 2. Authorize on GitHub

1. Click the link to open [github.com/login/device](https://github.com/login/device) (or use the copy button)
2. Enter your code
3. Click **Authorize** on GitHub
4. Return to GetThatQuick — it detects the authorization automatically

### 3. Select a model

Once connected, a `github-copilot` provider appears in your providers list:

1. Set it as the **active provider** (click "Use" next to it)
2. Edit the provider and set a model, e.g. `claude-sonnet-4.5`
3. Start chatting

---

## Available Models

After connecting, you can fetch available models via **Settings → Models & LLM → github-copilot → (expand) → Load Models**.

Common model IDs to try:

| Model ID | Description |
|----------|-------------|
| `claude-sonnet-4.5` | Claude Sonnet 4.5 — fast, smart, great for coding |
| `claude-sonnet-4.6` | Claude Sonnet 4.6 — latest Sonnet |
| `claude-opus-4.5` | Claude Opus 4.5 — most capable Claude |
| `gpt-4.1` | OpenAI's latest GPT |
| `gpt-4o` | Fast GPT-4 variant |
| `gemini-2.5-pro` | Google Gemini 2.5 Pro |

:::note
Model availability depends on your Copilot plan. If a model returns a 404, try a different one.
:::

---

## How It Works

Under the hood:

1. GetThatQuick starts an **OAuth device flow** using the same client ID as VS Code's Copilot extension
2. After you authorize, a GitHub OAuth token (`gho_...`) is stored as your provider's API key
3. Before each request, the server automatically exchanges the `gho_` token for a **short-lived Copilot API token** (valid ~30 minutes)
4. The token is cached and refreshed transparently — you never need to re-authenticate

The Copilot API is OpenAI-compatible, so all of GetThatQuick's features (streaming, thinking tokens, plan mode, etc.) work normally.

---

## Disconnecting

1. **Settings → Models & LLM**
2. Click **Disconnect** next to the GitHub Copilot section
3. The stored token is removed

You can reconnect at any time by repeating the setup steps.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Code expired before authorizing | Click "Connect GitHub Copilot" again to get a new code |
| "Failed to get Copilot token" | Token expired or revoked — disconnect and reconnect |
| Model returns 404 | That model isn't available on your plan — try another |
| No models appear in list | Make sure the provider is connected and active |
| Rate limit errors | Copilot has request limits per plan; wait a few seconds |

---

## Privacy Note

Your GitHub OAuth token is stored locally in `~/.getthatquick/config/settings.json`. It never leaves your machine except to authenticate with GitHub and send requests to `api.githubcopilot.com`. All conversation data is stored locally as always.
