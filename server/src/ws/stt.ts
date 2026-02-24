// ── WebSocket STT handler — /ws/stt ──────────────────────────────────────
//
// Accepts binary PCM audio chunks (16-bit LE, 16 kHz, mono) and returns
// JSON transcript events: { type: "partial"|"final", text: string }
//
// Lifecycle per connection:
//   open   → load model (cached), create recognizer
//   message → feed audio → send partial/final transcript
//   close  → get final result, free recognizer

import type { ServerWebSocket } from "bun";
import * as vosk from "../services/vosk";
import { isModelDownloaded } from "../services/models";
import { getSettings } from "../services/config";
import type { TranscriptEvent, STTError } from "@shared/types";

/** Per-connection state attached to the WebSocket. */
export interface STTSessionData {
  recognizer: any | null;
  lastActivity: number;
}

// ── Handlers ──────────────────────────────────────────────────────────────

/** Called when a WebSocket connection is opened at /ws/stt. */
export function handleSTTOpen(ws: ServerWebSocket<STTSessionData>): void {
  const { stt } = getSettings();

  if (!stt.activeModel || !isModelDownloaded(stt.activeModel)) {
    sendError(
      ws,
      "No speech model downloaded. Go to Settings to download one."
    );
    ws.close(1008, "No model available");
    return;
  }

  try {
    vosk.loadModel();
    const recognizer = vosk.createRecognizer();
    ws.data = { recognizer, lastActivity: Date.now() };
  } catch (err: any) {
    sendError(ws, err.message ?? "Failed to initialize STT");
    ws.close(1011, "STT init failed");
  }
}

/** Called for each incoming WebSocket message (binary audio data). */
export function handleSTTMessage(
  ws: ServerWebSocket<STTSessionData>,
  message: Buffer | string
): void {
  if (!ws.data?.recognizer) {
    sendError(ws, "No active recognizer");
    return;
  }

  // Only accept binary audio data
  if (typeof message === "string") {
    sendError(ws, "Expected binary audio data, got text");
    return;
  }

  ws.data.lastActivity = Date.now();
  const buf = Buffer.from(message);
  const accepted = vosk.acceptWaveform(ws.data.recognizer, buf);

  if (accepted) {
    // A complete utterance is ready
    const text = vosk.getResult(ws.data.recognizer);
    if (text) {
      send(ws, { type: "final", text });
    }
  } else {
    // In-progress partial result
    const text = vosk.getPartialResult(ws.data.recognizer);
    if (text) {
      send(ws, { type: "partial", text });
    }
  }
}

/** Called when the WebSocket connection closes. */
export function handleSTTClose(ws: ServerWebSocket<STTSessionData>): void {
  if (!ws.data?.recognizer) return;

  // Flush any remaining audio
  const text = vosk.getFinalResult(ws.data.recognizer);
  if (text) {
    try {
      send(ws, { type: "final", text });
    } catch {
      // Connection already closed, ignore
    }
  }

  vosk.freeRecognizer(ws.data.recognizer);
  ws.data.recognizer = null;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function send(ws: ServerWebSocket<any>, event: TranscriptEvent): void {
  ws.send(JSON.stringify(event));
}

function sendError(ws: ServerWebSocket<any>, message: string): void {
  const event: STTError = { type: "error", message };
  ws.send(JSON.stringify(event));
}
