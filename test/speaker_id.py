#!/usr/bin/env python3
"""
Speaker Identification using Vosk.

Usage:
    uv run speaker_id.py <audio.wav>

The WAV file must be 16kHz, mono, 16-bit PCM.
Use record_audio.py to capture and convert audio automatically.
"""

import os
import sys
import wave
import json
import numpy as np

from vosk import Model, KaldiRecognizer, SpkModel

# Paths – small model lives in ./model, speaker model in ./model-spk
MODEL_PATH = "model"
SPK_MODEL_PATH = "model-spk"

# ── sanity checks ────────────────────────────────────────────────────────────
for path, name in [(MODEL_PATH, "speech model"), (SPK_MODEL_PATH, "speaker model")]:
    if not os.path.exists(path):
        print(f"[ERROR] {name} not found at '{path}'.")
        if name == "speech model":
            print("Run:  curl -L -o m.zip https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip && unzip m.zip && mv vosk-model-small-en-us-0.15 model")
        else:
            print("Run:  curl -L -o s.zip https://alphacephei.com/vosk/models/vosk-model-spk-0.4.zip && unzip s.zip && mv vosk-model-spk-0.4 model-spk")
        sys.exit(1)

if len(sys.argv) < 2:
    print("Usage: uv run speaker_id.py <audio.wav>")
    sys.exit(1)

wav_path = sys.argv[1]
wf = wave.open(wav_path, "rb")
if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getcomptype() != "NONE":
    print("[ERROR] Audio must be WAV mono 16-bit PCM. Use record_audio.py to convert.")
    sys.exit(1)

# ── load models ───────────────────────────────────────────────────────────────
print("Loading speech model …")
model = Model(MODEL_PATH)

print("Loading speaker model …")
spk_model = SpkModel(SPK_MODEL_PATH)

rec = KaldiRecognizer(model, wf.getframerate())
rec.SetSpkModel(spk_model)

# ── reference speaker x-vector ────────────────────────────────────────────────
# Replace this with the x-vector printed for YOUR reference speaker.
# Leave as None to skip distance comparison.
spk_sig = None
# spk_sig = [-1.110417, 0.09703002, ...]   # paste your vector here

def cosine_dist(x, y):
    nx, ny = np.array(x), np.array(y)
    return 1 - np.dot(nx, ny) / np.linalg.norm(nx) / np.linalg.norm(ny)

# ── run recognition ───────────────────────────────────────────────────────────
print(f"\n{'─'*60}")
print(f"Processing: {wav_path}")
print(f"{'─'*60}\n")

while True:
    data = wf.readframes(4000)
    if not data:
        break
    if rec.AcceptWaveform(data):
        res = json.loads(rec.Result())
        if res.get("text"):
            print(f"[Segment] {res['text']}")
        if "spk" in res:
            print(f"  X-vector (first 8): {res['spk'][:8]} …")
            if spk_sig:
                dist = cosine_dist(spk_sig, res["spk"])
                label = "MATCH ✓" if dist < 0.4 else "different speaker"
                print(f"  Speaker distance: {dist:.4f}  → {label}  ({res['spk_frames']} frames)")

res = json.loads(rec.FinalResult())
print(f"\n[Final] {res.get('text', '')}")
if "spk" in res:
    vec = res["spk"]
    print(f"\nX-vector for this audio (copy as your reference):\nspk_sig = {vec}")
    if spk_sig:
        dist = cosine_dist(spk_sig, vec)
        label = "MATCH ✓" if dist < 0.4 else "different speaker"
        print(f"Speaker distance: {dist:.4f}  → {label}  ({res['spk_frames']} frames)")

print("\nNote: utterances shorter than ~4 s give less reliable x-vectors.")
