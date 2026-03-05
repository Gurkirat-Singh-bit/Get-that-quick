---
sidebar_position: 2
title: Templates API
---

# Templates API

REST API reference for template management. Templates can be **local** (user-created, read-write) or **community** (synced from GitHub, read-only).

**Base URL:** `/api/templates`

---

## List Templates

```
GET /api/templates
```

Returns metadata for all templates (both local and community). The `content` field is **not** included — use the single-template endpoint to get content.

**Response:**

```json
{
  "ok": true,
  "data": [
    {
      "id": "tmpl_a1b2c3d4e5f6",
      "title": "Bug Report",
      "description": "Generate detailed bug reports",
      "category": "development",
      "tags": ["bugs", "qa"],
      "source": "local",
      "author": null,
      "version": "1.0.0",
      "createdAt": "2026-03-01T12:00:00.000Z",
      "updatedAt": "2026-03-01T12:00:00.000Z"
    }
  ]
}
```

**Response Type:** `ApiResponse<TemplateMeta[]>`

---

## List Categories

```
GET /api/templates/categories
```

Returns a list of unique categories across all templates.

**Response:**

```json
{
  "ok": true,
  "data": ["development", "communication", "writing", "general", "data", "design"]
}
```

**Response Type:** `ApiResponse<string[]>`

---

## Get Template

```
GET /api/templates/:id
```

Returns a single template including its full content.

| Parameter | Location | Description      |
| --------- | -------- | ---------------- |
| `id`      | Path     | The template ID  |

**Response:**

```json
{
  "ok": true,
  "data": {
    "id": "tmpl_a1b2c3d4e5f6",
    "title": "Bug Report",
    "description": "Generate detailed bug reports",
    "category": "development",
    "tags": ["bugs", "qa"],
    "source": "local",
    "content": "You are a QA engineer. Given a description of a bug...",
    "author": null,
    "version": "1.0.0",
    "variables": [
      { "name": "severity", "label": "Bug Severity", "default": "medium", "required": true }
    ],
    "createdAt": "2026-03-01T12:00:00.000Z",
    "updatedAt": "2026-03-01T12:00:00.000Z"
  }
}
```

**Response Type:** `ApiResponse<Template>`

---

## Create Template

```
POST /api/templates
```

Creates a new local template. The server generates a unique ID in the format `tmpl_<nanoid(12)>`.

**Request Body:**

```json
{
  "title": "Code Review",
  "content": "You are a senior engineer performing a code review...",
  "description": "Perform thorough code reviews",
  "category": "development",
  "tags": ["code-review", "engineering"]
}
```

| Field         | Type     | Required | Description                     |
| ------------- | -------- | -------- | ------------------------------- |
| `title`       | string   | Yes      | Template title                  |
| `content`     | string   | Yes      | Template content (system prompt)|
| `description` | string   | No       | Short description               |
| `category`    | string   | No       | Category for grouping           |
| `tags`        | string[] | No       | Tags for filtering              |

**Response:** `201 Created`

```json
{
  "ok": true,
  "data": {
    "id": "tmpl_k7m8n9p0q1r2",
    "title": "Code Review",
    "source": "local",
    "..."
  }
}
```

**Response Type:** `ApiResponse<Template>`

---

## Update Template

```
PUT /api/templates/:id
```

Updates an existing **local** template. Accepts a partial template object.

| Parameter | Location | Description      |
| --------- | -------- | ---------------- |
| `id`      | Path     | The template ID  |

**Request Body:**

```json
{
  "title": "Updated Code Review",
  "tags": ["code-review", "engineering", "best-practices"]
}
```

**Body Type:** `Partial<Template>`

**Response:**

```json
{
  "ok": true,
  "data": { "..." }
}
```

**Response Type:** `ApiResponse<Template>`

---

## Delete Template

```
DELETE /api/templates/:id
```

Permanently deletes a **local** template.

| Parameter | Location | Description      |
| --------- | -------- | ---------------- |
| `id`      | Path     | The template ID  |

**Response:**

```json
{
  "ok": true,
  "data": null
}
```

---

## Sync Community Templates

```
POST /api/templates/sync
```

Syncs community templates from a GitHub repository.

**Request Body:**

```json
{
  "repoUrl": "https://github.com/example/templates"
}
```

| Field     | Type   | Required | Description                                |
| --------- | ------ | -------- | ------------------------------------------ |
| `repoUrl` | string | No       | GitHub repo URL (uses default if omitted)  |

**Response:**

```json
{
  "ok": true,
  "data": {
    "added": 5,
    "total": 12
  }
}
```

:::warning
Community templates are **read-only**. You cannot update or delete them through the API. To modify a community template, create a local copy instead.
:::
