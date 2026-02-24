#!/usr/bin/env python3
"""
Audio capture & conversion helper for Vosk.

Modes
-----
record   – capture from microphone and save as Vosk-compatible WAV
convert  – convert any audio file to Vosk-compatible WAV (16 kHz mono 16-bit)
devices  – list available input devices

Examples
--------
# record 5 seconds from default mic, save to speech.wav, then run speaker_id
uv run record_audio.py record --seconds 5 --out speech.wav
uv run speaker_id.py speech.wav

# convert an mp3 / m4a / stereo wav to the right format (needs ffmpeg)
uv run record_audio.py convert input.mp3 --out speech.wav

# list microphone devices
uv run record_audio.py devices
"""

import argparse
import subprocess
import sys
import wave
import shutil
import struct

import numpy as np
import sounddevice as sd
from scipy.io import wavfile


# ── helpers ───────────────────────────────────────────────────────────────────

SAMPLE_RATE = 16000   # Vosk requirement
CHANNELS    = 1       # mono
DTYPE       = "int16" # 16-bit PCM


def list_devices():
    print(sd.query_devices())


def record(seconds: float, out: str, device=None):
    print(f"Recording {seconds}s from mic → {out}  (press Ctrl-C to stop early)")
    try:
        audio = sd.rec(
            int(seconds * SAMPLE_RATE),
            samplerate=SAMPLE_RATE,
            channels=CHANNELS,
            dtype=DTYPE,
            device=device,
            blocking=False,
        )
        print("  ● recording …")
        sd.wait()
    except KeyboardInterrupt:
        sd.stop()
        print("  ■ stopped early")

    _save_wav(audio, out)
    print(f"Saved: {out}")


def _save_wav(data: np.ndarray, path: str):
    """Write int16 numpy array as a mono 16 kHz WAV file."""
    data = np.squeeze(data).astype(np.int16)
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)          # 2 bytes = 16 bit
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(data.tobytes())


def convert(src: str, out: str):
    """
    Convert any audio file to 16 kHz mono 16-bit PCM WAV using ffmpeg.
    Falls back to scipy for plain WAV files if ffmpeg is not installed.
    """
    if shutil.which("ffmpeg"):
        cmd = [
            "ffmpeg", "-y",
            "-i", src,
            "-ar", str(SAMPLE_RATE),
            "-ac", "1",
            "-sample_fmt", "s16",
            out,
        ]
        print(f"Converting {src} → {out}  (via ffmpeg)")
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print("[ffmpeg error]", result.stderr[-500:])
            sys.exit(1)
    else:
        # Fallback: scipy only handles WAV
        print(f"[WARN] ffmpeg not found. Attempting scipy fallback (WAV only).")
        try:
            rate, data = wavfile.read(src)
        except Exception as e:
            print(f"[ERROR] {e}\nInstall ffmpeg to convert non-WAV files: sudo apt install ffmpeg")
            sys.exit(1)

        # stereo → mono
        if data.ndim > 1:
            data = data.mean(axis=1)

        # resample
        if rate != SAMPLE_RATE:
            from scipy.signal import resample
            n_samples = int(len(data) * SAMPLE_RATE / rate)
            data = resample(data, n_samples)

        data = data.astype(np.int16)
        _save_wav(data, out)

    print(f"Saved: {out}")
    _verify_wav(out)


def _verify_wav(path: str):
    with wave.open(path, "rb") as wf:
        ch, sw, fr, nf = wf.getnchannels(), wf.getsampwidth(), wf.getframerate(), wf.getnframes()
        duration = nf / fr
        print(f"  ✓ {fr} Hz | {'mono' if ch==1 else 'STEREO'} | {sw*8}-bit | {duration:.1f}s")
        if ch != 1 or sw != 2 or fr != SAMPLE_RATE:
            print("  [WARN] File may not be Vosk-compatible (need 16000 Hz mono 16-bit).")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Audio capture/conversion for Vosk")
    sub = parser.add_subparsers(dest="cmd")

    # record
    p_rec = sub.add_parser("record", help="Record from microphone")
    p_rec.add_argument("--seconds", type=float, default=5, help="Duration in seconds (default: 5)")
    p_rec.add_argument("--out", default="speech.wav", help="Output WAV file")
    p_rec.add_argument("--device", type=int, default=None, help="Input device index (see 'devices')")

    # convert
    p_conv = sub.add_parser("convert", help="Convert audio file to Vosk-compatible WAV")
    p_conv.add_argument("input", help="Source audio file (mp3, m4a, wav, …)")
    p_conv.add_argument("--out", default="speech.wav", help="Output WAV file")

    # devices
    sub.add_parser("devices", help="List input audio devices")

    args = parser.parse_args()

    if args.cmd == "record":
        record(args.seconds, args.out, args.device)
    elif args.cmd == "convert":
        convert(args.input, args.out)
    elif args.cmd == "devices":
        list_devices()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
