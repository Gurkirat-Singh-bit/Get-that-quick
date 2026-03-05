---
sidebar_position: 1
title: Sessions API
---

# Sessions API

REST API reference for session management.

**Base URL:** `/api/sessions`

---

## List Sessions

```
GET /api/sessions
```

Returns metadata for all sessions, sorted newest first. Messages are **not** included — use the single-session endpoint to retrieve messages.

**Response:**

```json
{
  "ok": true,
  "data": [
    {
      "id": "sess_a1b2c3d4e5f6",
      "title": "Debug React hooks",
      "templateId": "tmpl_x1y2z3w4v5u6",
      "projectId": null,
      "createdAt": "2026-03-01T12:00:00.000Z",
      "updatedAt": "2026-03-01T12:05:00.000Z",
      "messageCount": 8
    }
  ]
}
```

**Response Type:** `ApiResponse<SessionMeta[]>`

---

## Get Session

```
GET /api/sessions/:id
```

Returns a single session with its full message history.

| Parameter | Location | Description       |
| --------- | -------- | ----------------- |
| `id`      | Path     | The session ID    |

**Response:**

```json
{
  "ok": true,
  "data": {
    "id": "sess_a1b2c3d4e5f6",
    "title": "Debug React hooks",
    "templateId": null,
    "projectId": null,
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:05:00.000Z",
    "messages": [
      {
        "id": "msg_001",
        "role": "user",
        "content": "Why is my useEffect running twice?",
        "source": "text",
        "timestamp": "2026-03-01T12:00:01.000Z"
      },
      {
        "id": "msg_002",
        "role": "assistant",
        "content": "In React 18 Strict Mode, effects run twice in development...",
        "timestamp": "2026-03-01T12:00:03.000Z"
      }
    ]
  }
}
```

**Response Type:** `ApiResponse<Session>`

---

## Create Session

```
POST /api/sessions
```

Creates a new session. The server generates a unique ID in the format `sess_<nanoid(12)>`.

**Request Body:**

```json
{
  "title": "New conversation",
  "templateId": "tmpl_x1y2z3w4v5u6"
}
```

| Field        | Type   | Required | Description                         |
| ------------ | ------ | -------- | ----------------------------------- |
| `title`      | string | No       | Session title (auto-generated if omitted) |
| `templateId` | string | No       | ID of template to initialize with   |

**Response:** `201 Created`

```json
{
  "ok": true,
  "data": {
    "id": "sess_k7m8n9p0q1r2",
    "title": "New conversation",
    "templateId": "tmpl_x1y2z3w4v5u6",
    "projectId": null,
    "createdAt": "2026-03-05T10:00:00.000Z",
    "updatedAt": "2026-03-05T10:00:00.000Z",
    "messages": []
  }
}
```

**Response Type:** `ApiResponse<Session>`

---

## Update Session

```
PUT /api/sessions/:id
```

Updates an existing session. Accepts a partial session object — only provided fields are updated.

| Parameter | Location | Description    |
| --------- | -------- | -------------- |
| `id`      | Path     | The session ID |

**Request Body:**

```json
{
  "title": "Updated title",
  "messages": [...]
}
```

**Body Type:** `Partial<Session>`

**Response:**

```json
{
  "ok": true,
  "data": {
    "id": "sess_a1b2c3d4e5f6",
    "title": "Updated title",
    "..."
  }
}
```

**Response Type:** `ApiResponse<Session>`

---

## Delete Session

```
DELETE /api/sessions/:id
```

Permanently deletes a session and all its messages.

| Parameter | Location | Description    |
| --------- | -------- | -------------- |
| `id`      | Path     | The session ID |

**Response:**

```json
{
  "ok": true,
  "data": null
}
```
