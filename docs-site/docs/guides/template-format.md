---
sidebar_position: 2
title: Template Format
---

# Template Format

Templates are `.md` files with YAML frontmatter and a Markdown body. The body **is** the system prompt sent to the AI provider.

---

## File Structure

```
---
YAML frontmatter (metadata)
---

Markdown body (system prompt)
```

---

## Frontmatter Fields

### Required

| Field         | Type     | Description                                      |
| ------------- | -------- | ------------------------------------------------ |
| `id`          | string   | Unique slug identifier (must match filename)     |
| `title`       | string   | Human-readable template name                     |
| `description` | string   | Short description of the template's purpose      |
| `category`    | string   | Category for grouping                            |
| `tags`        | string[] | Tags for filtering and search                    |
| `createdAt`   | string   | ISO 8601 creation timestamp                      |
| `updatedAt`   | string   | ISO 8601 last-modified timestamp                 |

### Optional

| Field       | Type               | Description                                    |
| ----------- | ------------------ | ---------------------------------------------- |
| `author`    | string             | Template author name                           |
| `version`   | string             | Semantic version (e.g., `1.0.0`)              |
| `variables` | TemplateVariable[] | List of user-fillable variable definitions     |

---

## Variables

Variables allow templates to accept user input before generating. They are referenced in the body using `{{name}}` syntax.

### Variable Fields

| Field      | Type    | Required | Description                          |
| ---------- | ------- | -------- | ------------------------------------ |
| `name`     | string  | Yes      | Variable identifier (used as `{{name}}` in body) |
| `label`    | string  | Yes      | Human-readable label shown in UI     |
| `default`  | string  | No       | Default value if user doesn't provide one |
| `required` | boolean | No       | Whether the variable must be filled  |

---

## Standard Categories

| Category        | Description                        |
| --------------- | ---------------------------------- |
| `development`   | Coding, debugging, code review     |
| `communication` | Emails, messages, documentation    |
| `writing`       | Creative writing, editing          |
| `general`       | General-purpose prompts            |
| `data`          | Data analysis, transformation      |
| `design`        | UI/UX, design feedback             |

---

## Storage

| Type      | Path                                | Permissions |
| --------- | ----------------------------------- | ----------- |
| Local     | `templates/local/`                  | Read-write  |
| Community | `templates/community/`              | Read-only   |

Templates with nested categories use subdirectories. For example, a template with category `code/frontend` is stored at `templates/local/code/frontend/`.

---

## File Naming

The filename **must match** the `id` field in the frontmatter:

```
bug-report.md  →  id: bug-report
code-review.md →  id: code-review
```

---

## Complete Example

```markdown
---
id: bug-report
title: Bug Report Generator
description: Generate detailed, structured bug reports from a brief description
category: development
tags:
  - bugs
  - qa
  - testing
author: GetThatQuick
version: 1.0.0
variables:
  - name: severity
    label: Bug Severity
    default: medium
    required: true
  - name: platform
    label: Target Platform
    default: web
    required: false
createdAt: "2026-01-15T10:00:00.000Z"
updatedAt: "2026-03-01T12:00:00.000Z"
---

You are a senior QA engineer. Given a brief description of a bug, generate a detailed bug report.

**Severity:** {{severity}}
**Platform:** {{platform}}

The report must include:
1. **Title** — Clear, concise summary
2. **Steps to Reproduce** — Numbered steps
3. **Expected Behavior** — What should happen
4. **Actual Behavior** — What actually happens
5. **Environment** — OS, browser, versions
6. **Additional Context** — Screenshots, logs, related issues

Use professional language. Be specific and actionable.
```
