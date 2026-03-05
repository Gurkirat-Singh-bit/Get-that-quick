---
sidebar_position: 4
title: Library Utilities
---

# Library Utilities

The `server/src/lib/` directory contains shared utilities, constants, and low-level bindings used across the server codebase.

---

## `constants.ts`

~71 lines

Defines shared constants and the default application configuration.

### Key Exports

| Export | Value | Description |
|--------|-------|-------------|
| `SAMPLE_RATE` | `16000` | Audio sample rate for Vosk STT (16 kHz) |
| `PORT` | `process.env.PORT \|\| 3000` | HTTP server port |
| `DEFAULT_SETTINGS` | *(object)* | Full default configuration object |

### `DEFAULT_SETTINGS`

The default settings object used when no `settings.json` exists on disk. It includes:

- **System prompt** — a sensible default system prompt for the LLM.
- **Provider config** — default provider name, empty API key, base URL, and model.
- **STT model** — default speech-to-text model ID.
- **Theme** — default UI theme (`"system"`).
- **Onboarding** — `completed: false` so the setup wizard runs on first launch.

---

## `errors.ts`

~136 lines

Provides structured error handling utilities for the API layer.

### Exports

| Export | Description |
|--------|-------------|
| `ApiError` | Custom error class with a `statusCode` property for HTTP-aware errors |
| `extractErrorMessage(error)` | Safely extracts a human-readable message from any thrown value |
| `errorResponse(c, error)` | Returns a Hono JSON error response with the appropriate status code |
| `successResponse(c, data, status?)` | Returns a standardised JSON success response |
| `withErrorHandling(handler)` | Higher-order function that wraps a route handler in a try/catch |

### `ApiError`

```typescript
class ApiError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string);
}
```

Throw an `ApiError` from any service or route to control the HTTP status code of the error response.

### `withErrorHandling()`

A higher-order function that wraps a Hono route handler in a `try/catch` block, automatically converting thrown errors into appropriate JSON error responses. 

:::note
`withErrorHandling` is defined but **not currently used** — routes handle errors inline with their own try/catch blocks.
:::

---

## `ffi.ts`

~134 lines

Provides **Vosk C library FFI bindings** using `bun:ffi`. This file bridges the native Vosk speech recognition library into the Bun runtime.

### `getVosk()` — Lazy Singleton

Returns the loaded Vosk FFI interface, initializing it on first call. The library is located by searching the following paths in order:

1. `VOSK_LIB_PATH` environment variable
2. `/usr/lib/`
3. `/usr/local/lib/`
4. Architecture-specific system library paths (e.g. `/usr/lib/x86_64-linux-gnu/`)

### `cstr()` Helper

Converts a JavaScript string to a null-terminated C string (`Uint8Array`) for passing to FFI functions.

### Bound C Functions

| FFI Function | Purpose |
|---|---|
| `vosk_set_log_level` | Set Vosk logging verbosity |
| `vosk_model_new` | Load a model from a filesystem path |
| `vosk_model_free` | Free a loaded model |
| `vosk_recognizer_new` | Create a recognizer from a model and sample rate |
| `vosk_recognizer_set_words` | Enable/disable word-level timestamps |
| `vosk_recognizer_accept_waveform` | Feed PCM audio data to a recognizer |
| `vosk_recognizer_result` | Get the current recognition result (JSON string) |
| `vosk_recognizer_partial_result` | Get the in-progress partial result |
| `vosk_recognizer_final_result` | Flush remaining audio and get the final result |
| `vosk_recognizer_free` | Free a recognizer instance |

---

## `paths.ts`

~117 lines

Centralises all **filesystem path derivation** and directory initialization. Every other module that needs a data path imports from here.

### `getDataDir()`

Returns the root data directory:

- If `$DATA_DIR` is set (e.g. in Docker), uses that value.
- Otherwise defaults to `~/.getthatquick/`.

### Path Functions

All paths are derived from `getDataDir()`:

| Function | Resolved Path |
|----------|---------------|
| `getDataDir()` | `~/.getthatquick/` |
| `getPromptsDir()` | `~/.getthatquick/prompts/` |
| `getTemplatesDir()` | `~/.getthatquick/templates/` |
| `getLocalTemplatesDir()` | `~/.getthatquick/templates/local/` |
| `getCommunityTemplatesDir()` | `~/.getthatquick/templates/community/` |
| `getModelsDir()` | `~/.getthatquick/models/` |
| `getConfigDir()` | `~/.getthatquick/config/` |
| `getSettingsPath()` | `~/.getthatquick/config/settings.json` |

### `ensureDataDirs()`

Creates the full directory tree if any directories are missing. Called during server bootstrap in `index.ts` before any other data access occurs.
