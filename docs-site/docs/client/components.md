---
sidebar_position: 3
title: Components
---

# Components

All components live under `src/components/` and are organized by domain.

---

## brand/

Branding components for the GetThatQuick logo.

### GtqIcon

`brand/gtq-icon.tsx`

Renders the GTQ logo as an `<img>` tag. Accepts standard image props for sizing.

### GtqLogo

`brand/gtq-logo.tsx`

Combines `GtqIcon` with an animated wordmark. Used in the sidebar header and onboarding screens.

---

## chat/

Core chat interaction components.

### ChatArea

`chat/chat-area.tsx`

The main message display area. Features:

- **Auto-scroll** — automatically scrolls to the latest message as content streams in
- **Drag-and-drop templates** — drop a template onto the chat area to start a session with that template's system prompt
- **Empty state** — displayed when no session is active, with quick-start hints
- **Streaming indicator** — visual feedback while the LLM is generating a response
- **Message list** — renders a sequence of `<Message />` components for the active session

### ChatInput

`chat/chat-input.tsx`

The message composition component at the bottom of the chat area.

- **Auto-expanding textarea** — grows vertically as the user types, up to a max height
- **Local voice dictation** — connects to the Vosk speech-to-text engine via WebSocket; microphone button toggles recording
- **Cloud voice dictation** — records audio via `MediaRecorder`, uploads to `/api/stt/transcribe`, and fills the input with the transcript (Groq Whisper or OpenAI Whisper)
- **Inline scrolling waveform** — when cloud recording is active the textarea is replaced by a live waveform visualization: 80 bars scroll right-to-left showing audio amplitude history, using the Web Audio API `AnalyserNode` with square-root amplitude scaling for high sensitivity
- **Document attachment** — attach files via a file picker or drag-and-drop onto the input area
- **Plan mode** — question-style UI for plan mode interactions
- **Stop button** — cancels an in-progress LLM generation via abort signal

**Props:**

| Prop | Type | Description |
|---|---|---|
| `sttProvider` | `"local" \| "groq" \| "openai-whisper"` | Which STT backend to use; controls recording path and waveform visibility |

### Message

`chat/message.tsx`

Renders a single chat message. Behavior varies by role:

**User messages:**
- Rendered as Markdown (via `react-markdown` + `remark-gfm` + `rehype-raw`)
- Inline edit button — click to modify the message and re-generate from that point
- Delete button — remove the message from the session

**Assistant messages:**
- Markdown rendering with syntax-highlighted code blocks and a **copy code** button
- **Think tag parsing** — detects `<think>...</think>` blocks and renders them as collapsible reasoning sections
- Action buttons:
  - **Copy** — copy the full response to clipboard
  - **Regenerate** — re-run the LLM for this turn
  - **Expand** — ask the LLM to elaborate on its response
  - **Refine** — ask the LLM to improve its response
  - **Save as Template** — save the system prompt / conversation as a reusable template
  - **Delete** — remove the message

---

## layout/

Persistent icon rails flanking the main content.

### IconRail

`layout/icon-rail.tsx`

Left-side 56px vertical bar with navigation icons:

| Icon | Library Icon | Action |
|---|---|---|
| Logo | `GtqIcon` | — |
| Chats | `MessagesSquare` | Switch left sidebar to chats view |
| Projects | `FolderKanban` | Switch left sidebar to projects view |
| Config | `SlidersHorizontal` | Toggle inline config panel |
| Settings | `Settings2` | Open settings overlay |

### RightIconRail

`layout/right-icon-rail.tsx`

Right-side 56px vertical bar with template actions:

| Icon | Library Icon | Action |
|---|---|---|
| All Templates | `LayoutGrid` | Show all templates |
| Community | `Globe` | Show community templates |
| My Templates | `FolderOpen` | Show user-created templates |
| New Template | `FilePlus2` | Create a new template |
| Import | `Download` | Import a template file |

---

## sidebar/

Collapsible side panels.

### LeftSidebar

`sidebar/left-sidebar.tsx`

Two view modes controlled by the `leftMode` state:

**Chats mode:**
- Flat list of all chat sessions
- Each session shows title and last-active timestamp
- Inline rename — double-click to edit session title
- Search — filter sessions by title

**Projects mode:**
- Hierarchical tree of projects and sessions
- Drag-and-drop sessions between projects
- Create / rename / delete projects

Both modes support:
- Click to select and load a session
- Right-click context menu for rename, delete, move

### RightSidebar

`sidebar/right-sidebar.tsx`

Template management panel:

- **Hierarchical category tree** — templates organized by category with collapsible groups
- **Search** — filter templates by name or category
- **Template creation form** — inline form to create a new template with name, category, and description
- **Drag-startable templates** — drag a template chip onto the chat area to apply it
- **Community sync** — pull/push templates from the community repository

---

## settings/

Configuration interfaces.

### ConfigPanel

`settings/config-panel.tsx`

An inline quick-config panel (toggled from the icon rail) for the most common generation settings:

- **System prompt** — override the default system prompt
- **Positive prompt** — text prepended to every message
- **Negative prompt** — text appended as negative guidance
- **Temperature** — controls randomness (slider)
- **Max tokens** — caps response length (number input)

### SettingsOverlay

`settings/settings-overlay.tsx`

A full-screen modal with 6 tabs:

| Tab | Contents |
|---|---|
| **General** | Application-wide preferences |
| **Templates** | Default template settings, import/export |
| **Models & LLM** | Provider selection, model management, download/activate/delete models; **GitHub Copilot OAuth device flow** (connect/disconnect) |
| **Voice/STT** | STT provider selector (Local Vosk / Groq Whisper / OpenAI Whisper), cloud API key + model input, Vosk model management |
| **Backup** | Export/import session data |
| **About** | Version info, links, credits |

---

## templates/

### TemplateEditor

`templates/template-editor.tsx`

A full-screen modal for editing a template. Fields include:

- Template metadata (name, category, description, tags)
- System prompt body (multi-line editor)
- Preview of the rendered prompt

Opened by setting `editingTemplateId` in the Dashboard state.

---

## ui/

Low-level primitives following the [shadcn/ui](https://ui.shadcn.com/) pattern. Built on Radix UI with styling via CVA (class-variance-authority) and Tailwind CSS.

| Component | File | Description |
|---|---|---|
| **Avatar** | `ui/avatar.tsx` | User/assistant avatar with fallback |
| **Button** | `ui/button.tsx` | Button with CVA variants (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`) and sizes (`default`, `sm`, `lg`, `icon`) |
| **Input** | `ui/input.tsx` | Styled text input |
| **ScrollArea** | `ui/scroll-area.tsx` | Custom scrollable container (Radix) |
| **Separator** | `ui/separator.tsx` | Horizontal/vertical divider (Radix) |
| **Tooltip** | `ui/tooltip.tsx` | Hover tooltip (Radix) |
