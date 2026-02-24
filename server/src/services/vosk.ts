// ── Vosk service — higher-level wrapper around the FFI module ─────────────
//
// Manages a single cached model pointer and creates per-session recognizers.
//
// Lifecycle:
//   1. loadModel()        — loads (or reuses) the active model from settings
//   2. createRecognizer()  — creates a recognizer for one STT session
//   3. acceptWaveform()    — feed PCM audio chunks
//   4. getResult() / getPartialResult() — read transcription
//   5. freeRecognizer()    — free when session ends (model stays cached)

import { ptr } from "bun:ffi";
import { getVosk, cstr } from "../lib/ffi";
import { SAMPLE_RATE } from "../lib/constants";
import { getSettings } from "./config";
import { getModelPath, isModelDownloaded } from "./models";

// ── Cached model state ───────────────────────────────────────────────────

let cachedModelId: string | null = null;
let cachedModelPtr: ReturnType<ReturnType<typeof getVosk>["vosk_model_new"]> | null = null;

// ── Model ─────────────────────────────────────────────────────────────────

/** Load the active Vosk model. Reuses the cached pointer if unchanged. */
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
      getVosk().vosk_model_free(cachedModelPtr);
    } catch {
      /* best-effort */
    }
  }

  const vosk = getVosk();
  vosk.vosk_set_log_level(-1); // suppress Kaldi spam

  const modelPath = getModelPath(modelId);
  console.log(`[vosk] Loading model: ${modelId}`);
  const model = vosk.vosk_model_new(cstr(modelPath));
  if (!model) {
    throw new Error(`Failed to load Vosk model from "${modelPath}"`);
  }

  cachedModelId = modelId;
  cachedModelPtr = model;
  console.log(`[vosk] Model loaded: ${modelId}`);
}

// ── Recognizer ────────────────────────────────────────────────────────────

/** Create a new recognizer bound to the cached model. */
export function createRecognizer(sampleRate?: number): any {
  if (!cachedModelPtr) {
    throw new Error("No Vosk model loaded. Call loadModel() first.");
  }

  const vosk = getVosk();
  const rate = sampleRate ?? getSettings().stt.sampleRate ?? SAMPLE_RATE;
  const rec = vosk.vosk_recognizer_new(cachedModelPtr, rate);
  if (!rec) {
    throw new Error("Failed to create Vosk recognizer");
  }

  vosk.vosk_recognizer_set_words(rec, 1);
  return rec;
}

// ── Audio processing ──────────────────────────────────────────────────────

/** Feed PCM audio data. Returns true when a complete utterance is ready. */
export function acceptWaveform(rec: any, data: Buffer): boolean {
  return !!getVosk().vosk_recognizer_accept_waveform(
    rec,
    ptr(data),
    data.length
  );
}

/** Read a final (committed) result from the recognizer. */
export function getResult(rec: any): string {
  const json = getVosk().vosk_recognizer_result(rec);
  try {
    return (JSON.parse(String(json ?? "{}")) as { text?: string }).text?.trim() ?? "";
  } catch {
    return "";
  }
}

/** Read a partial (in-progress) result from the recognizer. */
export function getPartialResult(rec: any): string {
  const json = getVosk().vosk_recognizer_partial_result(rec);
  try {
    return (
      (JSON.parse(String(json ?? "{}")) as { partial?: string }).partial?.trim() ?? ""
    );
  } catch {
    return "";
  }
}

/** Flush and read the final result (call before freeing). */
export function getFinalResult(rec: any): string {
  const json = getVosk().vosk_recognizer_final_result(rec);
  try {
    return (JSON.parse(String(json ?? "{}")) as { text?: string }).text?.trim() ?? "";
  } catch {
    return "";
  }
}

/** Free a recognizer (model is kept cached). */
export function freeRecognizer(rec: any): void {
  try {
    getVosk().vosk_recognizer_free(rec);
  } catch {
    /* best-effort */
  }
}

// ── Status ────────────────────────────────────────────────────────────────

/** Whether any model is currently loaded. */
export function isModelLoaded(): boolean {
  return cachedModelPtr !== null;
}

/** ID of the currently loaded model, or null. */
export function getLoadedModelId(): string | null {
  return cachedModelId;
}
