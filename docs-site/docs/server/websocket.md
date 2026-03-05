---
sidebar_position: 5
title: WebSocket STT
---

# WebSocket STT

The file `server/src/ws/stt.ts` (~162 lines) implements the WebSocket handler for **real-time speech-to-text** using Vosk. The WebSocket endpoint is available at `/ws/stt`.

## Protocol

| Direction | Format | Content |
|-----------|--------|---------|
| **Client → Server** | Binary | Raw PCM audio (16-bit little-endian, 16 kHz, mono) |
| **Server → Client** | JSON | Transcript events |

:::warning
Text messages are **rejected** — the server only accepts binary WebSocket frames containing PCM audio data.
:::

## Events

The server sends JSON events to the client with the following shapes:

### `ready`

Sent immediately after the connection is established and the recognizer is initialised.

```json
{ "type": "ready" }
```

### `partial`

Emitted as audio is processed, containing the in-progress transcript that may change as more audio arrives.

```json
{ "type": "partial", "text": "hello wor" }
```

### `final`

Emitted when the recognizer is confident about a segment of speech. This text is stable and will not change.

```json
{ "type": "final", "text": "hello world" }
```

### `error`

Sent when something goes wrong (model not loaded, recognizer failure, etc.).

```json
{ "type": "error", "message": "No STT model is loaded" }
```

## Handler Lifecycle

### `handleSTTOpen`

1. **Auto-discover model** — If no STT model is explicitly set as active, the handler scans the models directory for any downloaded model and loads the first one found.
2. **Load model** — Calls `vosk.loadModel()` if one isn't already in memory.
3. **Create recognizer** — Allocates a session-scoped Vosk recognizer at the configured sample rate (16 kHz).
4. **Send `ready`** — Notifies the client that the pipeline is initialised and audio can be sent.

### `handleSTTMessage`

1. **Reject text frames** — only binary data is accepted.
2. **Feed audio** — passes the binary PCM buffer to `vosk.acceptWaveform()`.
3. **Emit transcripts** — if the recognizer produces a result, sends a `final` event; otherwise sends a `partial` event with the current hypothesis.

### `handleSTTClose`

1. **Flush** — calls `vosk.getFinalResult()` to get any remaining text and sends a final `final` event if non-empty.
2. **Free recognizer** — releases the recognizer memory via `vosk.freeRecognizer()`.

## Session Data

Each active WebSocket connection is tracked with an `STTSessionData` object:

```typescript
type STTSessionData = {
  recognizer: number; // Pointer to the native Vosk recognizer
  lastActivity: number; // Timestamp of the last received audio frame
};
```

## Client-Side Integration

The client establishes the STT pipeline as follows:

1. **`AudioContext`** — created at **16 kHz** sample rate to match Vosk's expected input.
2. **`ScriptProcessorNode`** — captures audio in real-time from the microphone.
3. **Float32 → Int16 conversion** — the Web Audio API produces `Float32Array` samples in the range `[-1, 1]`. These are converted to 16-bit signed integers (`Int16Array`) before sending.
4. **WebSocket** — binary frames are sent to `/ws/stt`. The client listens for `partial` and `final` JSON events to update the transcript in the UI.

```
Microphone → AudioContext (16kHz) → ScriptProcessorNode
  → Float32→Int16 → WebSocket (binary) → /ws/stt
  ← JSON events (partial/final) ← WebSocket
```
