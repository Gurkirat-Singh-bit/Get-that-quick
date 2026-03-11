---
sidebar_position: 4
---

# Cloud Speech-to-Text

GetThatQuick supports two STT modes:

| Mode | Requires | Works Offline | Best For |
|------|----------|---------------|----------|
| **Local (Vosk)** | Downloaded model (40 MB+) | ✅ Yes | Privacy, no internet |
| **Cloud (Groq/OpenAI)** | API key | ❌ No | Low-RAM devices, fast setup |

---

## Groq Whisper (Recommended — Free)

Groq provides **free** access to `whisper-large-v3-turbo` — extremely fast, accurate, and OpenAI-compatible.

**Free tier limits:**
- 8 hours of audio per day
- 20 requests per minute
- No credit card required

### Setup

1. Get a free API key at [console.groq.com](https://console.groq.com) → API Keys
2. In GetThatQuick: **Settings → Voice / STT**
3. Select **Groq Whisper** as provider
4. Paste your API key (`gsk_...`)
5. Pick a model (`whisper-large-v3-turbo` is recommended)

### Usage

- Click the **mic button** in the chat input (shows a small blue dot when cloud STT is active)
- Speak — a waveform animation appears showing your audio level
- Click the mic again (or the MicOff button) to stop recording
- A brief "Transcribing…" appears, then your words fill the input
- Edit if needed, then send

---

## OpenAI Whisper

If you already have an OpenAI API key:

1. **Settings → Voice / STT**
2. Select **OpenAI Whisper**
3. Paste your OpenAI API key (`sk-...`)
4. Select a model:
   - `whisper-1` — classic, cheapest
   - `gpt-4o-mini-transcribe` — faster, smarter
   - `gpt-4o-transcribe` — best accuracy

**Pricing:** ~$0.006/minute (~$0.36/hour)

---

## Switching Between Local and Cloud

You can switch at any time without losing data:

1. **Settings → Voice / STT → STT Provider**
2. Click **Local (Vosk)**, **Groq Whisper**, or **OpenAI Whisper**
3. The preference is saved immediately

The mic button adapts its tooltip to show the active mode.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "No API key configured" | Add your key in Settings → Voice |
| "Audio recording too short" | Hold the mic button at least 1–2 seconds |
| "STT provider error (401)" | API key is invalid or expired |
| "STT provider error (429)" | Rate limit hit — wait a moment or upgrade plan |
| Transcription is empty | Try speaking more clearly or closer to the mic |
| No waveform visible | Browser may not support Web Audio API (use Chrome/Firefox) |
