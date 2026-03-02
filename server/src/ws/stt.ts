/**
 * @fileoverview WebSocket handler for real-time speech-to-text.
 *
 * Accepts binary PCM audio (16-bit LE, 16 kHz, mono) from the browser
 * and returns JSON transcript events back over the same socket:
 * `{ type: "partial" | "final", text: string }`.
 *
 * One Vosk recognizer is created per connection and freed on close.
 * The underlying model stays loaded between connections (cached).
 *
 * Endpoint: `ws://host/ws/stt`
 *
 * @module ws/stt
 * @license CC BY-NC 4.0 — {@link https://creativecommons.org/licenses/by-nc/4.0/}
 * @author Gurkirat Singh
 * @created 2026-02-25
 * @updated 2026-03-03
 */

import type { ServerWebSocket } from "bun";
import * as vosk from "../services/vosk";
import type { VoskRecognizer } from "../services/vosk";
import { isModelDownloaded, listModels } from "../services/models";
import { getSettings, updateSettings } from "../services/config";
import type { TranscriptEvent, STTError } from "@shared/types";

/** Per-connection state attached to the WebSocket. */
export interface STTSessionData {
  recognizer: VoskRecognizer | null;
  lastActivity: number;
}

// ── Handlers ──────────────────────────────────────────────────────────────

/**
 * Called when a WebSocket connection is opened at /ws/stt.
 * Loads the Vosk model and creates a recognizer for this session.
 *
 * @param ws - The WebSocket connection object.
 */
export function handleSTTOpen(ws: ServerWebSocket<STTSessionData>): void {
  const settings = getSettings();
  let activeModel = settings.stt.activeModel;

  // If no model is explicitly active, try to find any downloaded model
  if (!activeModel || !isModelDownloaded(activeModel)) {
    const models = listModels("");
    const downloaded = models.find((m) => m.downloaded);
    if (downloaded) {
      activeModel = downloaded.id;
      // Persist the auto-activation
      updateSettings({ stt: { ...settings.stt, activeModel } });
    } else {
      sendError(
        ws,
        "No speech model downloaded. Go to Settings to download one."
      );
      ws.close(1008, "No model available");
      return;
    }
  }

  try {
    vosk.loadModel();
    const recognizer = vosk.createRecognizer();
    ws.data = { recognizer, lastActivity: Date.now() };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to initialize STT";
    sendError(ws, message);
    ws.close(1011, "STT init failed");
  }
}

/**
 * Called for each incoming WebSocket message (binary audio data).
 * Feeds audio to the recognizer and sends back partial/final transcripts.
 *
 * @param ws - The WebSocket connection object.
 * @param message - Binary PCM audio data or text (text is rejected).
 */
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

/**
 * Called when the WebSocket connection closes.
 * Flushes remaining audio and frees the recognizer.
 *
 * @param ws - The WebSocket connection object.
 */
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

/**
 * Send a typed transcript event to the client as JSON.
 *
 * @param ws    - The WebSocket connection.
 * @param event - Transcript event to send.
 */
function send(ws: ServerWebSocket<STTSessionData>, event: TranscriptEvent): void {
  ws.send(JSON.stringify(event));
}

/**
 * Send an error message to the client as JSON.
 *
 * @param ws      - The WebSocket connection.
 * @param message - Human-readable error description.
 */
function sendError(ws: ServerWebSocket<STTSessionData>, message: string): void {
  const event: STTError = { type: "error", message };
  ws.send(JSON.stringify(event));
}
