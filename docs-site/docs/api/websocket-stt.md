---
sidebar_position: 6
title: WebSocket STT
---

# WebSocket STT

WebSocket API reference for real-time speech-to-text using Vosk.

**Endpoint:** `ws://localhost:3000/ws/stt` (or `wss://` in production)

---

## Overview

The STT WebSocket accepts **binary audio input** and returns **JSON text events**. It provides real-time speech recognition powered by Vosk, running entirely on-device with no external API calls.

**Direction:** Binary audio in → JSON events out

---

## Input Format

The WebSocket expects raw PCM audio with the following specification:

| Property    | Value               |
| ----------- | ------------------- |
| Format      | Raw PCM             |
| Bit depth   | 16-bit              |
| Byte order  | Little-endian       |
| Sample rate | 16,000 Hz (16 kHz)  |
| Channels    | Mono (1 channel)    |

---

## Output Events

All output events are JSON objects with a `type` discriminator.

### Ready

Sent immediately after connection when the model is loaded and the recognizer is ready.

```json
{ "type": "ready" }
```

### Partial

Sent during active speech recognition with intermediate results. These update rapidly as the user speaks.

```json
{ "type": "partial", "text": "hello how are" }
```

### Final

Sent when Vosk detects an utterance boundary (pause in speech). Contains the finalized transcription.

```json
{ "type": "final", "text": "hello how are you" }
```

### Error

Sent when an error occurs during recognition.

```json
{ "type": "error", "message": "Model not loaded" }
```

---

## Client Implementation

### Audio Capture

The client captures audio from the microphone using the Web Audio API, converting from `Float32` to `Int16` PCM before sending over the WebSocket.

```ts
// Create AudioContext at 16kHz sample rate
const audioContext = new AudioContext({ sampleRate: 16000 });

// Get microphone stream
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const source = audioContext.createMediaStreamSource(stream);

// Create processor node
const processor = audioContext.createScriptProcessor(4096, 1, 1);

// Connect: microphone → processor → destination
source.connect(processor);
processor.connect(audioContext.destination);
```

### Float32 to Int16 Conversion

Audio samples from the Web Audio API are `Float32` (-1.0 to 1.0) and must be converted to `Int16` (-32768 to 32767) before sending.

```ts
processor.onaudioprocess = (event) => {
  const float32Data = event.inputBuffer.getChannelData(0);
  const int16Data = new Int16Array(float32Data.length);

  for (let i = 0; i < float32Data.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Data[i]));
    int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  ws.send(int16Data.buffer);
};
```

### WebSocket Connection

```ts
const ws = new WebSocket("ws://localhost:3000/ws/stt");

ws.binaryType = "arraybuffer";

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case "ready":
      console.log("STT ready");
      break;
    case "partial":
      // Update UI with intermediate text
      setPartialText(data.text);
      break;
    case "final":
      // Commit finalized text
      appendFinalText(data.text);
      break;
    case "error":
      console.error("STT error:", data.message);
      break;
  }
};
```

---

## Lifecycle

```
1. OPEN
   └─ Server loads the active Vosk model
   └─ Server creates a recognizer instance
   └─ Server sends: { "type": "ready" }

2. MESSAGES
   └─ Client sends binary PCM audio buffers
   └─ Server feeds audio to Vosk recognizer
   └─ Server sends partial/final transcript events

3. CLOSE
   └─ Server flushes remaining audio through recognizer
   └─ Server sends any final transcript
   └─ Server cleans up recognizer and resources
```

---

## Error Handling

| Scenario                    | Behavior                                      |
| --------------------------- | --------------------------------------------- |
| No model downloaded         | Error event: `"No STT model available"`       |
| Model loading fails         | Error event with details, connection closed    |
| Invalid audio format        | Recognition produces empty/garbage results     |
| WebSocket disconnects       | Resources cleaned up automatically             |
