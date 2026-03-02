/**
 * @fileoverview Vosk C library FFI (foreign function interface) bindings.
 *
 * Loads `libvosk.so` lazily on the first call and exposes its C API
 * as typed Bun FFI symbols. Set the `VOSK_LIB_PATH` env variable to
 * point to the library if it is in a non-standard location.
 *
 * @module lib/ffi
 * @license CC BY-NC 4.0 — {@link https://creativecommons.org/licenses/by-nc/4.0/}
 * @author Gurkirat Singh
 * @created 2026-02-25
 * @updated 2026-03-03
 */

import { dlopen, FFIType } from "bun:ffi";
import { existsSync } from "node:fs";

// ── Library search paths (first match wins) ──────────────────────────────

const LIB_SEARCH_PATHS = [
  process.env.VOSK_LIB_PATH,
  "/usr/lib/libvosk.so",
  "/usr/local/lib/libvosk.so",
  "/usr/lib/x86_64-linux-gnu/libvosk.so",
  "/usr/lib/aarch64-linux-gnu/libvosk.so",
].filter(Boolean) as string[];

/**
 * Search well-known paths for `libvosk.so`.
 *
 * @returns The first path that exists on disk.
 * @throws {Error} If the library is not found in any search path.
 */
function findLibrary(): string {
  for (const p of LIB_SEARCH_PATHS) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    `libvosk not found. Searched:\n  ${LIB_SEARCH_PATHS.join("\n  ")}\n` +
      "Set VOSK_LIB_PATH to the full path of libvosk.so."
  );
}

// ── Lazy singleton ────────────────────────────────────────────────────────────

type VoskSymbols = ReturnType<typeof openVosk>;
let _symbols: VoskSymbols | null = null;

/**
 * Open the Vosk shared library and bind all needed C functions.
 *
 * @returns Bound Vosk C API symbols.
 * @throws {Error} If the library cannot be loaded.
 */
function openVosk() {
  const libPath = findLibrary();
  console.log(`[vosk] Loading ${libPath}`);

  const { symbols } = dlopen(libPath, {
    vosk_set_log_level: {
      args: [FFIType.int],
      returns: FFIType.void,
    },
    vosk_model_new: {
      args: [FFIType.cstring],
      returns: FFIType.pointer,
    },
    vosk_model_free: {
      args: [FFIType.pointer],
      returns: FFIType.void,
    },
    vosk_recognizer_new: {
      args: [FFIType.pointer, FFIType.float],
      returns: FFIType.pointer,
    },
    vosk_recognizer_set_words: {
      args: [FFIType.pointer, FFIType.int],
      returns: FFIType.void,
    },
    vosk_recognizer_accept_waveform: {
      args: [FFIType.pointer, FFIType.pointer, FFIType.int],
      returns: FFIType.int,
    },
    vosk_recognizer_result: {
      args: [FFIType.pointer],
      returns: FFIType.cstring,
    },
    vosk_recognizer_partial_result: {
      args: [FFIType.pointer],
      returns: FFIType.cstring,
    },
    vosk_recognizer_final_result: {
      args: [FFIType.pointer],
      returns: FFIType.cstring,
    },
    vosk_recognizer_free: {
      args: [FFIType.pointer],
      returns: FFIType.void,
    },
  });

  return symbols;
}

/**
 * Get Vosk FFI symbols (lazy-loaded, cached).
 * Searches for libvosk.so in standard locations and loads it on first call.
 * Subsequent calls return the cached symbols.
 *
 * @returns Object containing all Vosk C API function pointers.
 * @throws {Error} If libvosk.so cannot be found in any search path.
 */
export function getVosk(): VoskSymbols {
  if (!_symbols) _symbols = openVosk();
  return _symbols;
}

/**
 * Create a null-terminated C string buffer from a JS string.
 * Required for passing strings to C functions via FFI.
 *
 * @param s - JavaScript string to convert.
 * @returns Buffer containing the string with null terminator.
 *
 * @example
 * ```ts
 * const pathBuf = cstr("/path/to/model");
 * vosk_model_new(pathBuf);
 * ```
 */
export function cstr(s: string): Buffer {
  return Buffer.from(s + "\0");
}
