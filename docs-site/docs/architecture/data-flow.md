---
sidebar_position: 3
title: Data Flow
---

# Data Flow

## Speech-to-Text Flow

Real-time audio capture in the browser is streamed to the server over WebSocket, where Vosk performs offline recognition and returns transcripts.

```text
Browser                          Server
──────                          ──────

AudioContext (16 kHz)
       │
       ▼
ScriptProcessor / AudioWorklet
       │
       ▼
PCM Int16 ArrayBuffer
       │
       ▼
WebSocket send(binary)  ──────►  /ws/stt
                                    │
                                    ▼
                              Vosk accept_waveform()
                              (via bun:ffi → libvosk.so)
                                    │
                         ┌──────────┴──────────┐
                         ▼                     ▼
                   Partial result         Final result
                   (interim text)         (committed text)
                         │                     │
                         ▼                     ▼
                    JSON frame             JSON frame
                         │                     │
              ◄──────────┴─────────────────────┘
              WebSocket message
                    │
                    ▼
         Update transcript in UI
```

### Audio Format

| Parameter   | Value           |
| ----------- | --------------- |
| Sample rate | 16,000 Hz       |
| Encoding    | PCM signed 16-bit integer |
| Channels    | 1 (mono)        |
| Transport   | WebSocket binary frames |

### Recognition Output

```json
// Partial result (sent frequently during speech)
{ "type": "partial", "text": "hello how are" }

// Final result (sent at phrase boundaries)
{ "type": "final", "text": "hello how are you" }
```

## Prompt Generation Flow

Chat messages are sent to the server, which injects the active template as a system prompt and streams the LLM response back via Server-Sent Events.

```text
Browser                          Server                         LLM Provider
──────                          ──────                         ────────────

User types message
       │
       ▼
POST /api/generate
{
  sessionId,
  templateId,
  messages[]
}
       │
       ▼
                              Load template by ID
                                    │
                                    ▼
                              Parse Markdown body
                              → system prompt string
                                    │
                                    ▼
                              Build messages array:
                              [
                                { role: "system", content: template },
                                ...messages[]
                              ]
                                    │
                                    ▼
                              OpenAI SDK chat.completions.create()
                              (stream: true)
                                    │
                                    ▼
                                                              ──────► Provider API
                                                              ◄────── SSE token stream
                                    │
                                    ▼
                              Forward SSE chunks
              ◄──────────────────────
              streamed response
                    │
                    ▼
         Render tokens incrementally
                    │
                    ▼
         On stream complete:
         auto-save assistant message
         to session JSON file
```

### Request Shape

```typescript
{
  sessionId: string;       // Target session to append to
  templateId?: string;     // Template to use as system prompt
  messages: Array<{        // Conversation history
    role: "user" | "assistant";
    content: string;
  }>;
}
```

## Template Flow

Templates are Markdown files with YAML frontmatter. The server parses them with `gray-matter` and injects the Markdown body as the LLM system prompt.

```text
~/getthatquick/templates/code-review.md
┌─────────────────────────────────────┐
│ ---                                 │
│ title: Code Review                  │
│ description: Review code for ...    │
│ variables:                          │
│   - name: language                  │
│     label: Programming Language     │
│ ---                                 │
│                                     │
│ You are an expert code reviewer.    │
│ Review the following {{language}}   │
│ code for bugs, style issues, and    │
│ performance improvements.           │
└─────────────────────────────────────┘
                 │
                 ▼
         gray-matter parse
                 │
        ┌────────┴────────┐
        ▼                 ▼
  YAML metadata      Markdown body
  {                   "You are an expert
    title,             code reviewer..."
    description,
    variables[]
  }
        │                 │
        ▼                 ▼
  Returned to        Injected as
  client for UI      system prompt
  rendering          in LLM call
```

### Template Lifecycle

1. **Seed** — built-in templates are copied to `~/getthatquick/templates/` on first run
2. **List** — `GET /api/templates` reads the directory and parses each file's frontmatter
3. **Read** — `GET /api/templates/:id` returns full metadata + body
4. **Create/Update** — `PUT /api/templates/:id` writes the Markdown file with serialized frontmatter
5. **Delete** — `DELETE /api/templates/:id` removes the file from disk

## Session Lifecycle

Sessions represent individual chat conversations, stored as JSON files.

```text
Create                    Add Messages              Stream & Save
──────                    ────────────              ─────────────

POST /api/sessions        POST /api/generate        LLM response complete
       │                         │                         │
       ▼                         ▼                         ▼
Generate nanoid           Append user message        Append assistant message
       │                  to messages[]              to messages[]
       ▼                         │                         │
Write session.json               ▼                         ▼
{                         Write updated              Write updated
  id,                     session.json               session.json
  title,                                                   │
  messages: [],                                            ▼
  createdAt,                                         Session is auto-saved
  updatedAt                                          after every exchange
}

List                      Delete
────                      ──────

GET /api/sessions         DELETE /api/sessions/:id
       │                         │
       ▼                         ▼
Read sessions/            Remove JSON file
directory listing         from disk
       │
       ▼
Parse each JSON,
return summary list
```

### Session JSON Structure

```json
{
  "id": "abc123",
  "title": "Code review request",
  "templateId": "code-review",
  "messages": [
    { "id": "msg_1", "role": "user", "content": "Review this function...", "timestamp": 1709654400000 },
    { "id": "msg_2", "role": "assistant", "content": "Here are my findings...", "timestamp": 1709654401000 }
  ],
  "createdAt": 1709654400000,
  "updatedAt": 1709654401000
}
```

## Settings Flow

Application settings are stored in a single JSON file with an in-memory cache for fast reads.

```text
              Read                              Update
              ────                              ──────

         GET /api/settings              PUT /api/settings
                │                              │
                ▼                              ▼
        Check in-memory cache           Receive partial settings
                │                              │
         ┌──────┴──────┐                       ▼
         ▼             ▼               Deep merge with
      Cache hit    Cache miss          current settings
         │             │                       │
         ▼             ▼                       ▼
      Return      Read settings.json    Write merged result
      cached      from disk             to settings.json
      value            │                       │
                       ▼                       ▼
                  Update cache           Update in-memory cache
                       │                       │
                       ▼                       ▼
                  Return settings        Return updated settings
```

### Deep Merge Behavior

Settings updates use **deep merge**, not replacement. This means:

- Sending `{ "llm": { "apiKey": "sk-new" } }` updates only the `apiKey` field
- All other fields in the `llm` object (and other top-level keys) are preserved
- This allows the client to send partial updates without needing to read-modify-write the full settings object
