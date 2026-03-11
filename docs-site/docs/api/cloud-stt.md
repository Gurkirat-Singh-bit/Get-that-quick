---
sidebar_position: 7
---

# Cloud STT API

**Base path:** `/api/stt`

Cloud speech-to-text transcription using Groq Whisper or OpenAI Whisper.
The API key stays server-side — the browser never contacts the STT provider directly.

---

## POST `/api/stt/transcribe`

Transcribe an audio recording. Accepts a multipart upload and forwards it to the configured cloud STT provider.

### Request

```http
POST /api/stt/transcribe
Content-Type: multipart/form-data
```

| Field | Type | Description |
|-------|------|-------------|
| `audio` | File | Audio recording (webm, ogg, wav, mp3, etc.) |

**Constraints:**
- Maximum file size: **25 MB** (Groq/OpenAI hard limit)
- Minimum size: 100 bytes (rejects empty/noise-only recordings)

### Response

```json
{
  "ok": true,
  "data": {
    "text": "The transcribed text from the audio recording."
  }
}
```

### Error Responses

| Status | Error |
|--------|-------|
| `400` | Cloud STT not configured — set provider in Settings → Voice |
| `400` | No API key configured for the provider |
| `400` | No audio file provided |
| `400` | File too large (> 25 MB) |
| `400` | Audio too short (< 100 bytes) |
| `502` | Network error calling STT provider |
| `502` | STT provider returned an error |

### Example (curl)

```bash
curl -X POST http://localhost:3000/api/stt/transcribe \
  -F "audio=@recording.webm"
```

---

## Configuration

Configure the cloud STT provider in `~/.getthatquick/config/settings.json` (or via Settings → Voice in the UI):

```json
{
  "stt": {
    "provider": "groq",
    "cloudApiKey": "gsk_...",
    "cloudModel": "whisper-large-v3-turbo"
  }
}
```

| Field | Values | Description |
|-------|--------|-------------|
| `provider` | `"local"`, `"groq"`, `"openai-whisper"` | STT engine to use |
| `cloudApiKey` | string | API key for the cloud provider |
| `cloudModel` | string | Model identifier (see below) |

### Available Models

**Groq (recommended — free tier):**
| Model | Speed | Accuracy |
|-------|-------|----------|
| `whisper-large-v3-turbo` | Fastest | Good |
| `whisper-large-v3` | Slower | Best |

**OpenAI Whisper:**
| Model | Notes |
|-------|-------|
| `whisper-1` | Classic model |
| `gpt-4o-transcribe` | Best accuracy |
| `gpt-4o-mini-transcribe` | Faster, cheaper |
