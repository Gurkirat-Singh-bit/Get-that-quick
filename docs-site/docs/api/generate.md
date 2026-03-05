---
sidebar_position: 3
title: Generate API
---

# Generate API

REST API reference for AI text generation. Forwards conversations to the configured AI provider and supports both streaming (SSE) and standard JSON responses.

**Base URL:** `/api/generate`

---

## Generate Completion

```
POST /api/generate
```

Sends a conversation to the AI provider. The request body is validated with `GenerateRequestSchema` (Zod).

**Request Body:**

```json
{
  "systemPrompt": "You are a helpful assistant.",
  "messages": [
    { "id": "msg_001", "role": "user", "content": "Hello!", "timestamp": "2026-03-05T10:00:00.000Z" }
  ],
  "stream": true,
  "temperature": 0.7,
  "maxTokens": 2048,
  "thinkingEnabled": false
}
```

| Field             | Type      | Required | Description                                     |
| ----------------- | --------- | -------- | ----------------------------------------------- |
| `systemPrompt`    | string    | Yes      | System prompt for the AI                        |
| `messages`        | Message[] | Yes      | Conversation history                            |
| `stream`          | boolean   | No       | Enable SSE streaming (default: false)           |
| `temperature`     | number    | No       | Sampling temperature                            |
| `maxTokens`       | number    | No       | Maximum tokens in response                      |
| `thinkingEnabled` | boolean   | No       | Enable extended thinking / chain-of-thought     |

### Streaming Response (SSE)

When `stream: true`, the response is a Server-Sent Events stream.

**Content-Type:** `text/event-stream`

#### Event Format

**Content chunks** — sent as the AI generates text:

```
data: {"content":"Hello"}

data: {"content":" there"}

data: {"content":"!"}
```

**Completion signal** — sent when generation is finished:

```
data: [DONE]
```

**Error event** — sent if an error occurs during streaming:

```
event: error
data: {"error":"Provider returned 429: rate limit exceeded"}
```

#### Full SSE Example

```
data: {"content":"The"}

data: {"content":" answer"}

data: {"content":" is"}

data: {"content":" 42."}

data: [DONE]
```

#### Client-Side Consumption

```ts
const response = await fetch("/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ systemPrompt, messages, stream: true }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

  for (const line of lines) {
    const data = line.slice(6); // Remove "data: "
    if (data === "[DONE]") break;
    const parsed = JSON.parse(data);
    // Append parsed.content to the UI
  }
}
```

### Non-Streaming Response (JSON)

When `stream: false` (default), the full response is returned as JSON.

**Response:**

```json
{
  "ok": true,
  "data": {
    "content": "The answer is 42."
  }
}
```

---

## List Provider Models

```
GET /api/generate/models/:provider
```

Lists available models from the specified AI provider.

| Parameter  | Location | Description                                   |
| ---------- | -------- | --------------------------------------------- |
| `provider` | Path     | Provider name (e.g., `openai`, `anthropic`)   |

**Response:**

```json
{
  "ok": true,
  "data": [
    { "id": "gpt-4o", "name": "GPT-4o" },
    { "id": "gpt-4o-mini", "name": "GPT-4o Mini" }
  ]
}
```

**Response Type:** `ApiResponse<{ id: string; name: string }[]>`
