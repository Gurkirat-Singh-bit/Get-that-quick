---
sidebar_position: 4
title: Hooks
---

# Hooks

Custom React hooks live in `src/hooks/` and encapsulate all data-fetching, state management, and side-effect logic.

---

## useSessions

**File:** `hooks/use-sessions.ts` (648 lines)

The largest and most complex hook — manages the full session lifecycle including CRUD operations, message handling, and LLM streaming.

### State

| Field | Type | Description |
|---|---|---|
| `sessions` | `Session[]` | All chat sessions |
| `activeSession` | `Session \| null` | Currently selected session |
| `loading` | `boolean` | Whether sessions are being fetched |
| `generating` | `boolean` | Whether the LLM is currently streaming a response |

### Key Methods

| Method | Description |
|---|---|
| `selectSession(id)` | Load and activate a session by ID |
| `createSession(templateId?)` | Create a new session, optionally from a template |
| `deleteSession(id)` | Delete a session |
| `renameSession(id, title)` | Rename a session |
| `sendMessage(content)` | Send a user message and stream the LLM response via `generateStream` |
| `regenerateLastResponse()` | Re-generate the last assistant message |
| `expandLastResponse()` | Ask the LLM to elaborate on its last response |
| `refineLastResponse()` | Ask the LLM to improve its last response |
| `stopGeneration()` | Abort the in-progress generation via AbortController |
| `editMessage(id, content)` | Edit a message and re-generate subsequent responses |
| `deleteMessage(id)` | Remove a specific message from the session |
| `moveSession(id, projectId)` | Move a session into a project folder |

### System Prompt Resolution

The system prompt sent to the LLM is resolved in priority order:

1. **Template content** — if the session was created from a template, use its system prompt
2. **Settings prompt** — the user's global system prompt from settings
3. **Default** — a built-in fallback prompt

### Auto-Naming

When the first user message is sent to a new session, the hook automatically generates a session title based on the message content (via the LLM).

### Streaming Flow

```
sendMessage(content)
  → append user message to session
  → call api.generateStream(sessionId, messages, options)
  → iterate AsyncGenerator<string> chunks
  → progressively build assistant message
  → on complete: finalize message + auto-name if needed
```

---

## useSettings

**File:** `hooks/use-settings.ts`

A lightweight wrapper around server-managed settings state.

### State

| Field | Type | Description |
|---|---|---|
| `settings` | `Settings \| null` | Current application settings |
| `loading` | `boolean` | Whether settings are being fetched |

### Methods

| Method | Description |
|---|---|
| `updateSettings(partial)` | Merge partial settings and persist to server |
| `testProvider(provider, config)` | Test connectivity to an LLM provider with given configuration |
| `refresh()` | Re-fetch settings from the server |

---

## useTemplates

**File:** `hooks/use-templates.ts`

Manages template CRUD and community synchronization.

### State

| Field | Type | Description |
|---|---|---|
| `community` | `Template[]` | Community-sourced templates |
| `local` | `Template[]` | User-created templates |
| `loading` | `boolean` | Whether templates are being fetched |
| `syncing` | `boolean` | Whether a community sync is in progress |

Templates are split by their `source` field — `"community"` vs `"local"`.

### Methods

| Method | Description |
|---|---|
| `createTemplate(data)` | Create a new local template |
| `updateTemplate(id, data)` | Update an existing template |
| `deleteTemplate(id)` | Delete a template |
| `getTemplate(id)` | Fetch a single template by ID |
| `refresh()` | Re-fetch all templates from the server |
| `syncCommunity()` | Pull latest community templates from the server |
