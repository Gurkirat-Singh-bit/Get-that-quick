/**
 * @fileoverview High-level Vosk speech recognition service.
 *
 * Wraps the low-level FFI bindings to provide a simple API:
 * load the active model once, create a recognizer per WebSocket
 * session, feed audio chunks, and read transcript results.
 *
 * Only one model is kept in memory at a time (cached by ID).
 * Switching models frees the old one before loading the new one.
 *
 * @module services/vosk
 * @license CC BY-NC 4.0 — {@link https://creativecommons.org/licenses/by-nc/4.0/}
 * @author Gurkirat Singh
 * @created 2026-02-25
 * @updated 2026-03-03
 */

import { ptr, type Pointer } from "bun:ffi";
import { getVosk, cstr } from "../lib/ffi";
import { SAMPLE_RATE } from "../lib/constants";
import { getSettings } from "./config";
import { getModelPath, isModelDownloaded } from "./models";

// ── Type definitions ──────────────────────────────────────────────────────

/** Opaque type for Vosk recognizer pointer (prevents mixing with other pointers). */
export type VoskRecognizer = { readonly __brand: unique symbol };

/** Opaque type for Vosk model pointer. */
type VoskModel = { readonly __brand: unique symbol };

// ── Cached model state ───────────────────────────────────────────────────

let cachedModelId: string | null = null;
let cachedModelPtr: VoskModel | null = null;

// ── Model ─────────────────────────────────────────────────────────────────

/**
 * Load the active Vosk model. Reuses the cached pointer if unchanged.
 *
 * @throws {Error} If no model is configured, model is not downloaded, or model loading fails.
 */
export function loadModel(): void {
  const { stt } = getSettings();
  const modelId = stt.activeModel;

  if (!modelId) {
    throw new Error("No active STT model configured.");
  }
  if (!isModelDownloaded(modelId)) {
    throw new Error(
      `Model "${modelId}" is not downloaded. Download it in Settings first.`
    );
  }

  // Already loaded — nothing to do
  if (cachedModelId === modelId && cachedModelPtr) return;

  // Free previous model if switching
  if (cachedModelPtr) {
    try {
      getVosk().vosk_model_free(cachedModelPtr as unknown as Pointer);
    } catch {
      /* best-effort */
    }
  }

  const vosk = getVosk();
  vosk.vosk_set_log_level(-1); // suppress Kaldi spam

  const modelPath = getModelPath(modelId);
  console.log(`[vosk] Loading model: ${modelId}`);
  const model = vosk.vosk_model_new(cstr(modelPath)) as VoskModel | null;
  if (!model) {
    throw new Error(`Failed to load Vosk model from "${modelPath}"`);
  }

  cachedModelId = modelId;
  cachedModelPtr = model;
  console.log(`[vosk] Model loaded: ${modelId}`);
}

// ── Recognizer ────────────────────────────────────────────────────────────

/**
 * Create a new recognizer bound to the cached model.
 *
 * @param sampleRate - Audio sample rate in Hz. Defaults to settings or 16000.
 * @returns A new VoskRecognizer instance.
 * @throws {Error} If no model is loaded or recognizer creation fails.
 */
export function createRecognizer(sampleRate?: number): VoskRecognizer {
  if (!cachedModelPtr) {
    throw new Error("No Vosk model loaded. Call loadModel() first.");
  }

  const vosk = getVosk();
  const rate = sampleRate ?? getSettings().stt.sampleRate ?? SAMPLE_RATE;
  const rec = vosk.vosk_recognizer_new(cachedModelPtr as unknown as Pointer, rate) as VoskRecognizer | null;
  if (!rec) {
    throw new Error("Failed to create Vosk recognizer");
  }

  vosk.vosk_recognizer_set_words(rec as unknown as Pointer, 1);
  return rec;
}

// ── Audio processing ──────────────────────────────────────────────────────

/**
 * Feed PCM audio data. Returns true when a complete utterance is ready.
 *
 * @param rec - The VoskRecognizer instance.
 * @param data - Buffer containing 16-bit PCM audio data.
 * @returns True if a complete utterance was detected, false if still processing.
 */
export function acceptWaveform(rec: VoskRecognizer, data: Buffer): boolean {
  return !!getVosk().vosk_recognizer_accept_waveform(
    rec as unknown as Pointer,
    ptr(data),
    data.length
  );
}

/**
 * Read a final (committed) result from the recognizer.
 *
 * @param rec - The VoskRecognizer instance.
 * @returns The transcribed text, or empty string if no result.
 */
export function getResult(rec: VoskRecognizer): string {
  const json = getVosk().vosk_recognizer_result(rec as unknown as Pointer);
  try {
    return (JSON.parse(String(json ?? "{}")) as { text?: string }).text?.trim() ?? "";
  } catch {
    return "";
  }
}

/**
 * Read a partial (in-progress) result from the recognizer.
 *
 * @param rec - The VoskRecognizer instance.
 * @returns The partial transcription, or empty string if nothing recognized yet.
 */
export function getPartialResult(rec: VoskRecognizer): string {
  const json = getVosk().vosk_recognizer_partial_result(rec as unknown as Pointer);
  try {
    return (
      (JSON.parse(String(json ?? "{}")) as { partial?: string }).partial?.trim() ?? ""
    );
  } catch {
    return "";
  }
}

/**
 * Flush and read the final result (call before freeing).
 *
 * @param rec - The VoskRecognizer instance.
 * @returns The final transcribed text from any remaining audio.
 */
export function getFinalResult(rec: VoskRecognizer): string {
  const json = getVosk().vosk_recognizer_final_result(rec as unknown as Pointer);
  try {
    return (JSON.parse(String(json ?? "{}")) as { text?: string }).text?.trim() ?? "";
  } catch {
    return "";
  }
}

/**
 * Free a recognizer (model is kept cached).
 *
 * @param rec - The VoskRecognizer instance to free.
 */
export function freeRecognizer(rec: VoskRecognizer): void {
  try {
    getVosk().vosk_recognizer_free(rec as unknown as Pointer);
  } catch {
    /* best-effort */
  }
}

// ── Status ────────────────────────────────────────────────────────────────

/**
 * Whether any model is currently loaded.
 *
 * @returns True if a model is loaded in memory.
 */
export function isModelLoaded(): boolean {
  return cachedModelPtr !== null;
}

/**
 * ID of the currently loaded model, or null.
 *
 * @returns The model ID string, or null if no model is loaded.
 */
export function getLoadedModelId(): string | null {
  return cachedModelId;
}
