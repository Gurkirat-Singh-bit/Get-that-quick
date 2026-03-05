---
sidebar_position: 6
title: Seed Templates
---

# Seed Templates

The `server/seed/` directory contains **five default prompt templates** that are copied into the user's local templates directory on first run. These give new users a useful starting set of prompts without requiring any manual setup.

## Seeding Behaviour

During server bootstrap, the `seedTemplates()` function checks whether `~/.getthatquick/templates/local/` is empty. If it is, every `.md` file in `server/seed/` is copied into the local templates directory. On subsequent starts, if the directory already contains files, seeding is skipped entirely.

## Default Templates

| File | Title | Category |
|------|-------|----------|
| `bug-report.md` | Bug Report | development |
| `code-review.md` | Code Review Request | development |
| `email-draft.md` | Email Draft | communication |
| `meeting-summary.md` | Meeting Summary & Action Items | productivity |
| `prompt-polish.md` | General Prompt Polish | general |

### 1. Bug Report (`bug-report.md`)

A template for generating structured bug reports. Category: **development**. Guides the LLM to produce reports with reproduction steps, expected vs. actual behaviour, and environment details.

### 2. Code Review Request (`code-review.md`)

A template for requesting thorough code reviews. Category: **development**. Instructs the LLM to analyse code for correctness, performance, readability, and potential issues.

### 3. Email Draft (`email-draft.md`)

A template for drafting professional emails. Category: **communication**. Provides the LLM with guidelines for tone, structure, and clarity in email composition.

### 4. Meeting Summary & Action Items (`meeting-summary.md`)

A template for summarising meetings. Category: **productivity**. Directs the LLM to extract key discussion points, decisions made, and action items with owners and deadlines.

### 5. General Prompt Polish (`prompt-polish.md`)

A template for improving and refining prompts. Category: **general**. Asks the LLM to take a rough prompt and enhance its clarity, specificity, and effectiveness.

## Template Format

Every template (seeded or user-created) follows the same format: a Markdown file with **YAML frontmatter** parsed by `gray-matter`.

```markdown
---
id: tmpl_abc123
title: Bug Report
description: Generate a structured bug report
category: development
tags:
  - bugs
  - qa
  - testing
createdAt: 2026-01-15T00:00:00.000Z
updatedAt: 2026-01-15T00:00:00.000Z
---

You are a QA engineer. Given the following information about a bug,
produce a clear and structured bug report...
```

### Frontmatter Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier (e.g. `tmpl_abc123`) |
| `title` | `string` | Human-readable template name |
| `description` | `string` | Short summary of what the template does |
| `category` | `string` | Category name; maps to a subdirectory |
| `tags` | `string[]` | Searchable tags for filtering |
| `createdAt` | `string` (ISO 8601) | Creation timestamp |
| `updatedAt` | `string` (ISO 8601) | Last modification timestamp |

### Body = System Prompt

The Markdown body below the frontmatter is the **system prompt** sent to the LLM when the template is applied. This is the actual instruction text that shapes the model's behaviour for the task.

When a user selects a template, its body content is injected as the system message in the conversation, providing task-specific guidance to the AI without the user needing to write detailed instructions manually.
