#!/usr/bin/env python3
"""
Real-time live transcription using Vosk.

Words appear on screen AS you speak:
  • Partial results update the current line while you're mid-sentence.
  • Confirmed segments are printed as a new line once Vosk finalises them.

Usage
-----
    uv run live_transcribe.py                  # default microphone
    uv run live_transcribe.py --device 2       # specific mic index
    uv run live_transcribe.py --list-devices   # show available mics
"""

import argparse
import json
import os
import queue
import sys

import sounddevice as sd
from vosk import Model, KaldiRecognizer

# ── config ────────────────────────────────────────────────────────────────────
MODEL_PATH  = "model"
SAMPLE_RATE = 16_000   # Hz  – Vosk requirement
BLOCK_SIZE  = 2_000    # samples per callback (~125 ms) – smaller = more responsive


# ── main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Live real-time transcription – words appear as you speak."
    )
    parser.add_argument(
        "--device", type=int, default=None,
        help="Input device index (run with --list-devices to find yours).",
    )
    parser.add_argument(
        "--list-devices", action="store_true",
        help="Print available audio input devices and exit.",
    )
    args = parser.parse_args()

    if args.list_devices:
        print(sd.query_devices())
        sys.exit(0)

    # ── model check ───────────────────────────────────────────────────────────
    if not os.path.exists(MODEL_PATH):
        print(f"[ERROR] Speech model not found at '{MODEL_PATH}'.")
        print(
            "Download it with:\n"
            "  curl -L -o m.zip https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip\n"
            "  unzip m.zip && mv vosk-model-small-en-us-0.15 model"
        )
        sys.exit(1)

    # ── load vosk ─────────────────────────────────────────────────────────────
    print("Loading model …", end=" ", flush=True)
    model = Model(MODEL_PATH)
    rec   = KaldiRecognizer(model, SAMPLE_RATE)
    rec.SetWords(True)   # include per-word timestamps in results
    print("ready.\n")

    # Thread-safe queue: audio callback → main loop
    audio_q: queue.Queue[bytes] = queue.Queue()

    def _audio_callback(indata, frames, time_info, status):
        """Called by sounddevice on every audio block (runs in a separate thread)."""
        if status:
            print(f"\n[audio] {status}", file=sys.stderr)
        audio_q.put(bytes(indata))

    # ── start mic stream ──────────────────────────────────────────────────────
    print("Listening … speak now. Press Ctrl-C to stop.\n")
    print("─" * 60)

    with sd.RawInputStream(
        samplerate = SAMPLE_RATE,
        blocksize  = BLOCK_SIZE,
        device     = args.device,
        dtype      = "int16",
        channels   = 1,
        callback   = _audio_callback,
    ):
        last_partial = ""

        while True:
            data = audio_q.get()

            if rec.AcceptWaveform(data):
                # ── full segment finalised ────────────────────────────────────
                result = json.loads(rec.Result())
                text   = result.get("text", "").strip()

                if text:
                    # Erase the partial line, then print the confirmed text
                    _clear_line(last_partial)
                    print(f"[✓] {text}")
                    last_partial = ""

            else:
                # ── partial (in-progress) result ──────────────────────────────
                partial = json.loads(rec.PartialResult()).get("partial", "").strip()

                if partial != last_partial:
                    _clear_line(last_partial)
                    # Show partial with a leading indicator
                    print(f"  … {partial}", end="", flush=True)
                    last_partial = partial


def _clear_line(previous_text: str) -> None:
    """Overwrite the current terminal line with spaces, then return to column 0."""
    width = len(previous_text) + 6   # +6 for the " … " prefix and some margin
    print(f"\r{' ' * width}\r", end="", flush=True)


# ── entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n[stopped]")
