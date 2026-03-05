---
sidebar_position: 4
title: Models API
---

# Models API

REST API reference for Vosk speech-to-text (STT) model management. The server ships with a manifest of **28 models across 17 languages** defined in `server/models.json`.

**Base URL:** `/api/models`

---

## List Models

```
GET /api/models
```

Returns all available models with their download and activation status.

**Response:**

```json
{
  "ok": true,
  "data": [
    {
      "id": "vosk-model-small-en-us-0.15",
      "name": "English (US) - Small",
      "language": "en-us",
      "size": "40M",
      "accuracy": "medium",
      "minRAM": "1GB",
      "url": "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip",
      "default": true,
      "downloaded": true,
      "active": true
    },
    {
      "id": "vosk-model-en-us-0.22",
      "name": "English (US) - Large",
      "language": "en-us",
      "size": "1.8G",
      "accuracy": "high",
      "minRAM": "4GB",
      "url": "https://alphacephei.com/vosk/models/vosk-model-en-us-0.22.zip",
      "default": false,
      "downloaded": false,
      "active": false
    }
  ]
}
```

**Response Type:** `ApiResponse<VoskModelInfo[]>`

---

## Download Model

```
POST /api/models/:id/download
```

Starts downloading a model. The response is an **SSE stream** that reports download progress.

| Parameter | Location | Description   |
| --------- | -------- | ------------- |
| `id`      | Path     | The model ID  |

**Content-Type:** `text/event-stream`

**Progress Events:**

```
data: {"status":"downloading","downloadedBytes":1048576,"totalBytes":41943040,"percent":2.5,"speed":"5.2 MB/s","eta":"7s"}

data: {"status":"downloading","downloadedBytes":20971520,"totalBytes":41943040,"percent":50.0,"speed":"6.1 MB/s","eta":"3s"}

data: {"status":"extracting","percent":100}

data: {"status":"complete"}
```

| Field             | Type   | Description                              |
| ----------------- | ------ | ---------------------------------------- |
| `status`          | string | `downloading`, `extracting`, `complete`  |
| `downloadedBytes` | number | Bytes downloaded so far                  |
| `totalBytes`      | number | Total file size in bytes                 |
| `percent`         | number | Download progress percentage             |
| `speed`           | string | Current download speed                   |
| `eta`             | string | Estimated time remaining                 |

---

## Cancel Download

```
DELETE /api/models/:id/download
```

Cancels an active model download.

| Parameter | Location | Description   |
| --------- | -------- | ------------- |
| `id`      | Path     | The model ID  |

**Response:**

```json
{
  "ok": true,
  "data": {
    "cancelled": true
  }
}
```

---

## Delete Model

```
DELETE /api/models/:id
```

Deletes a downloaded model from disk.

| Parameter | Location | Description   |
| --------- | -------- | ------------- |
| `id`      | Path     | The model ID  |

**Response:**

```json
{
  "ok": true,
  "data": null
}
```

---

## Activate Model

```
PUT /api/models/:id/activate
```

Sets a model as the active STT model. The model must already be downloaded.

| Parameter | Location | Description   |
| --------- | -------- | ------------- |
| `id`      | Path     | The model ID  |

**Response:**

```json
{
  "ok": true,
  "data": {
    "activeModel": "vosk-model-small-en-us-0.15"
  }
}
```

:::info
The full list of 28 models across 17 languages is defined in [`server/models.json`](https://github.com/Gurkirat-Singh-bit/Get-that-quick/blob/main/server/models.json). Models vary widely in size (40MB to 4GB+) and accuracy.
:::
