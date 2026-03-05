---
sidebar_position: 2
title: Pages
---

# Pages

GetThatQuick has two top-level pages, selected by `App.tsx` based on whether the user has completed onboarding.

---

## Dashboard

**File:** `pages/dashboard.tsx`

The Dashboard is the main application shell. It composes the entire UI from a horizontal strip of panels and overlays.

### Layout Structure

```
┌──────────┬──────────────┬──┬───────────────┬──┬──────────────────┬──────────┐
│ IconRail │ LeftSidebar  │↔ │   ChatArea    │↔ │  RightSidebar    │RightIcon │
│  (56px)  │ (resizable)  │  │               │  │  (resizable)     │  Rail    │
│          │              │  │               │  │                  │  (56px)  │
└──────────┴──────────────┴──┴───────────────┴──┴──────────────────┴──────────┘
                          ↕ ResizeHandle      ↕ ResizeHandle
```

**Overlays** rendered on top:
- `SettingsOverlay` — full modal settings panel
- `TemplateEditor` — full-screen template editing modal

### State

| State | Type | Description |
|---|---|---|
| `panels` | `{ left, right }` | Visibility toggles for sidebars |
| `settingsOpen` | `boolean` | Whether the settings overlay is shown |
| `configPanelOpen` | `boolean` | Whether the inline config panel is open |
| `leftMode` | `"chats" \| "projects"` | Left sidebar view mode |
| `leftWidth` / `rightWidth` | `number` | Sidebar widths (clamped 200–520px) |
| `projects` | `Project[]` | Project tree (persisted to localStorage) |
| `documents` | `Document[]` | Attached documents for current session |
| `editingTemplateId` | `string \| null` | Template currently being edited |
| `templateFilter` | `string` | Search filter for template sidebar |

### Hooks Used

- **`useSessions()`** — session CRUD, message sending, LLM streaming
- **`useTemplates()`** — template CRUD, community sync
- **`useSettings()`** — server-managed settings state

### ResizeHandle

A subcomponent rendered between resizable panels. It listens for `mousedown` → `mousemove` → `mouseup` to let users drag-resize the left and right sidebars within the 200–520px range.

---

## Onboarding

**File:** `pages/onboarding.tsx`

A 5-step setup wizard shown on first launch (before settings are configured).

### Steps

| # | Step | Skippable | Description |
|---|---|---|---|
| 1 | **Welcome** | No | Introduction and branding |
| 2 | **VoskModel** | Yes | Configure local speech-to-text model |
| 3 | **LLMProvider** | No | Select LLM provider (Ollama, OpenAI, etc.) |
| 4 | **APIKeys** | Yes | Enter API keys for remote providers |
| 5 | **Done** | No | Confirmation and finish |

### UI Elements

- **Progress bar** spans the top of the wizard, filled proportionally to the current step
- **Step dots** indicate position within the flow, with active/completed states
- **Skip buttons** appear on optional steps (Vosk, API Keys)

### Completion Flow

When the user reaches step 5 and finishes:

1. Settings are saved to the server via the API client
2. The `onComplete` callback fires, which causes `App.tsx` to re-evaluate and switch to the Dashboard
