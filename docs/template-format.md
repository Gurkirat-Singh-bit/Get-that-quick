# GetThatQuick Template Format (`.prompt`)

Templates use **YAML frontmatter** inside Markdown files. This is the
universal format used by both community and local templates.

## Structure

```yaml
---
id: "unique-slug"
title: "Human-Readable Title"
description: "One-line description of what this template does"
category: "development"          # category slug
tags: ["code", "review", "pr"]   # searchable keywords
author: "your-handle"            # optional — who created it
version: "1.0.0"                 # optional — semver
variables:                       # optional — declared placeholders
  - name: "language"
    label: "Programming Language"
    default: "TypeScript"
    required: true
  - name: "context"
    label: "Additional Context"
    required: false
createdAt: "2025-01-01T00:00:00Z"
updatedAt: "2025-01-01T00:00:00Z"
---

Your system prompt goes here in regular Markdown.

Use **{{language}}** and **{{context}}** to reference declared variables.
The workbench will prompt the user to fill these in before starting a chat.
```

## Field Reference

| Field         | Required | Type       | Description                                |
|---------------|----------|------------|--------------------------------------------|
| `id`          | ✅       | `string`   | Unique slug — used as filename and API key |
| `title`       | ✅       | `string`   | Display name in the sidebar                |
| `description` | ✅       | `string`   | Short summary shown below the title        |
| `category`    | ✅       | `string`   | Grouping category (e.g. `development`)     |
| `tags`        | ✅       | `string[]` | Searchable keywords                        |
| `author`      | ❌       | `string`   | Creator name or handle                     |
| `version`     | ❌       | `string`   | Semver string for versioned templates      |
| `variables`   | ❌       | `array`    | Declared template variables (see below)    |
| `createdAt`   | ✅       | `string`   | ISO-8601 creation timestamp                |
| `updatedAt`   | ✅       | `string`   | ISO-8601 last-modified timestamp           |

### Variable Fields

| Field      | Required | Type      | Description                           |
|------------|----------|-----------|---------------------------------------|
| `name`     | ✅       | `string`  | Identifier — used as `{{name}}`       |
| `label`    | ✅       | `string`  | Human-readable label for the form     |
| `default`  | ❌       | `string`  | Pre-filled default value              |
| `required` | ❌       | `boolean` | Whether the user must fill this in    |

## Categories

Standard categories (create your own as needed):

- `development` — Code generation, reviews, debugging
- `communication` — Emails, messages, documentation
- `writing` — Creative writing, blog posts, copywriting
- `general` — Prompt polishing, brainstorming, analysis
- `data` — Data analysis, SQL, spreadsheets
- `design` — UI/UX, design systems, accessibility

## Variables

Variables are declared in the YAML frontmatter and referenced in the
prompt body using double-brace syntax: `{{variable_name}}`.

When a user starts a chat from a template that has variables, the UI
shows a form asking them to fill in each variable before the first
message.

## File Naming

Templates are stored as `.md` files. The filename should match the `id`:

```
templates/
  code-review.md
  email-draft.md
  my-custom-template.md
```

## Examples

See the seed templates in `server/seed/` for working examples.
