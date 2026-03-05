---
sidebar_position: 5
title: Settings API
---

# Settings API

REST API reference for application settings management. API keys are **masked** in responses for security.

**Base URL:** `/api/settings`

---

## Get Settings

```
GET /api/settings
```

Returns the current application settings. API keys are masked — only the **first 4** and **last 4** characters are visible, with the rest replaced by asterisks.

**Response:**

```json
{
  "ok": true,
  "data": {
    "ai": {
      "provider": "openai",
      "providers": {
        "openai": {
          "apiKey": "sk-p...Yx4f",
          "model": "gpt-4o",
          "baseUrl": "https://api.openai.com/v1"
        },
        "anthropic": {
          "apiKey": "sk-a...Mn3k",
          "model": "claude-sonnet-4-20250514",
          "baseUrl": "https://api.anthropic.com"
        }
      },
      "systemPrompt": "You are a helpful assistant.",
      "temperature": 0.7,
      "maxTokens": 4096,
      "thinkingEnabled": false,
      "planMode": false
    },
    "stt": {
      "activeModel": "vosk-model-small-en-us-0.15",
      "sampleRate": 16000
    },
    "general": {
      "theme": "dark"
    },
    "onboarding": {
      "completed": true
    }
  }
}
```

**Response Type:** `ApiResponse<Settings>`

---

## Update Settings

```
PUT /api/settings
```

Updates application settings using a **deep merge** strategy — only provided fields are updated, nested objects are merged rather than replaced.

**Request Body:**

```json
{
  "ai": {
    "temperature": 0.9,
    "providers": {
      "openai": {
        "model": "gpt-4o-mini"
      }
    }
  }
}
```

**Body Type:** `Partial<Settings>`

:::caution Masked Key Handling
When the client sends back masked API keys (e.g., `"sk-p...Yx4f"`), the server **detects the mask pattern** and does **not** overwrite the stored real key. This prevents accidental key corruption when the client round-trips settings.
:::

**Response:**

```json
{
  "ok": true,
  "data": { "..." }
}
```

**Response Type:** `ApiResponse<Settings>` (keys masked in response)

---

## Test Provider

```
POST /api/settings/test-provider
```

Tests connectivity to an AI provider by making a lightweight request.

**Request Body:**

```json
{
  "apiKey": "sk-p...Yx4f",
  "model": "gpt-4o",
  "baseUrl": "https://api.openai.com/v1"
}
```

**Body Type:** `AIProviderConfig`

| Field     | Type   | Required | Description                          |
| --------- | ------ | -------- | ------------------------------------ |
| `apiKey`  | string | Yes      | Provider API key (can be masked)     |
| `model`   | string | Yes      | Model ID to test with                |
| `baseUrl` | string | Yes      | Provider base URL                    |

:::info
When a **masked** API key is sent (matching the first 4 + last 4 pattern), the server automatically **restores the real key** from stored settings before making the test request.
:::

**Success Response:**

```json
{
  "ok": true,
  "data": {
    "connected": true
  }
}
```

**Failure Response:**

```json
{
  "ok": true,
  "data": {
    "connected": false,
    "error": "Invalid API key"
  }
}
```
