#!/usr/bin/env bun
/**
 * Real-time live transcription – TypeScript + Bun + Vosk C FFI
 *
 * Uses Bun's built-in bun:ffi to call libvosk.so directly (no npm package
 * needed). The .so is re-used from the Python venv in the parent folder.
 *
 * Words appear on screen AS you speak:
 *   • Partial results update the current line while you're mid-sentence.
 *   • Confirmed segments are printed as a new line once Vosk finalises them.
 *
 * Audio is captured via `arecord` (ALSA – built into Linux).
 *
 * Usage
 * -----
 *   bun run live_transcribe.ts                   # default mic
 *   bun run live_transcribe.ts --list-devices    # list ALSA capture devices
 *   bun run live_transcribe.ts --device hw:1,0   # specific ALSA device
 */

import { dlopen, FFIType, ptr } from "bun:ffi";
import { existsSync }           from "node:fs";
import { resolve, dirname }     from "node:path";
import { fileURLToPath }        from "node:url";
import { parseArgs }            from "node:util";
import { spawn }                from "node:child_process";

// ── paths ─────────────────────────────────────────────────────────────────────
const __dirname  = dirname(fileURLToPath(import.meta.url));
const MODEL_PATH = resolve(__dirname, "../model");

// libvosk.so ships inside the Python vosk pip package; re-use it here.
const LIBVOSK    = resolve(
  __dirname,
  "../.venv/lib/python3.11/site-packages/vosk/libvosk.so"
);

// ── config ────────────────────────────────────────────────────────────────────
const SAMPLE_RATE = 16_000;   // Hz – Vosk requirement

// ── CLI args ──────────────────────────────────────────────────────────────────
const { values: args } = parseArgs({
  args: process.argv.slice(2),
  options: {
    device:         { type: "string",  default: "default" },
    "list-devices": { type: "boolean", default: false },
  },
  allowPositionals: false,
});

if (args["list-devices"]) {
  console.log("Available ALSA capture devices:\n");
  Bun.spawnSync(["arecord", "-l"], { stdout: "inherit", stderr: "inherit" });
  process.exit(0);
}

// ── sanity checks ─────────────────────────────────────────────────────────────
for (const [p, label] of [[MODEL_PATH, "model"], [LIBVOSK, "libvosk.so"]] as [string, string][]) {
  if (!existsSync(p)) {
    console.error(`[ERROR] ${label} not found at '${p}'.`);
    process.exit(1);
  }
}

// ── load Vosk C API via bun:ffi ───────────────────────────────────────────────
const { symbols: vosk } = dlopen(LIBVOSK, {
  vosk_set_log_level: {
    args:    [FFIType.int],
    returns:  FFIType.void,
  },
  vosk_model_new: {
    args:    [FFIType.cstring],
    returns:  FFIType.pointer,
  },
  vosk_model_free: {
    args:    [FFIType.pointer],
    returns:  FFIType.void,
  },
  vosk_recognizer_new: {
    args:    [FFIType.pointer, FFIType.float],
    returns:  FFIType.pointer,
  },
  vosk_recognizer_set_words: {
    args:    [FFIType.pointer, FFIType.int],
    returns:  FFIType.void,
  },
  vosk_recognizer_accept_waveform: {
    args:    [FFIType.pointer, FFIType.pointer, FFIType.int],
    returns:  FFIType.int,
  },
  vosk_recognizer_result: {
    args:    [FFIType.pointer],
    returns:  FFIType.cstring,
  },
  vosk_recognizer_partial_result: {
    args:    [FFIType.pointer],
    returns:  FFIType.cstring,
  },
  vosk_recognizer_final_result: {
    args:    [FFIType.pointer],
    returns:  FFIType.cstring,
  },
  vosk_recognizer_free: {
    args:    [FFIType.pointer],
    returns:  FFIType.void,
  },
});

// Helper: null-terminated Buffer from a JS string (required for cstring args).
function cstr(s: string): Buffer { return Buffer.from(s + "\0"); }

// ── initialise Vosk ───────────────────────────────────────────────────────────
vosk.vosk_set_log_level(-1);    // suppress Kaldi log spam

process.stdout.write("Loading model … ");
const model = vosk.vosk_model_new(cstr(MODEL_PATH));
if (!model) { console.error("Failed to load model."); process.exit(1); }

const rec = vosk.vosk_recognizer_new(model, SAMPLE_RATE);
if (!rec)   { console.error("Failed to create recognizer."); process.exit(1); }

vosk.vosk_recognizer_set_words(rec, 1);
console.log("ready.\n");

// ── start arecord ─────────────────────────────────────────────────────────────
const arecord = spawn("arecord", [
  "-D", args.device as string,
  "-r", String(SAMPLE_RATE),
  "-f", "S16_LE",
  "-c", "1",
  "-t", "raw",
  "-q",
]);

arecord.on("error", (err) => {
  console.error(`\n[ERROR] Could not start arecord: ${err.message}`);
  console.error("Install alsa-utils:  sudo apt install alsa-utils");
  process.exit(1);
});

arecord.stderr.on("data", (chunk: Buffer) =>
  process.stderr.write(`[arecord] ${chunk}`)
);

console.log("Listening … speak now. Press Ctrl-C to stop.\n");
console.log("─".repeat(60));

// ── recognition loop ──────────────────────────────────────────────────────────
let lastPartial = "";

arecord.stdout.on("data", (chunk: Buffer) => {
  const accepted = vosk.vosk_recognizer_accept_waveform(rec, ptr(chunk), chunk.length);

  if (accepted) {
    const json = vosk.vosk_recognizer_result(rec);
    const text = (JSON.parse(json ?? "{}") as { text?: string }).text?.trim() ?? "";
    if (text) {
      clearLine(lastPartial);
      console.log(`[✓] ${text}`);
      lastPartial = "";
    }
  } else {
    const json    = vosk.vosk_recognizer_partial_result(rec);
    const partial = (JSON.parse(json ?? "{}") as { partial?: string }).partial?.trim() ?? "";

    if (partial !== lastPartial) {
      clearLine(lastPartial);
      process.stdout.write(`  … ${partial}`);
      lastPartial = partial;
    }
  }
});

// ── helpers ───────────────────────────────────────────────────────────────────
function clearLine(prev: string): void {
  process.stdout.write(`\r${" ".repeat(prev.length + 6)}\r`);
}

function shutdown(): void {
  arecord.kill();

  const json = vosk.vosk_recognizer_final_result(rec);
  const text = (JSON.parse(json ?? "{}") as { text?: string }).text?.trim() ?? "";
  if (text) {
    clearLine(lastPartial);
    console.log(`[✓] ${text}`);
  }

  vosk.vosk_recognizer_free(rec);
  vosk.vosk_model_free(model);

  console.log("\n[stopped]");
  process.exit(0);
}

process.on("SIGINT",  shutdown);
process.on("SIGTERM", shutdown);
