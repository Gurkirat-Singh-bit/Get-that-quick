---
sidebar_position: 1
title: TypeScript Types
---

# TypeScript Types

`shared/types.ts` is the **single source of truth** for all TypeScript interfaces shared between the client and server. Both sides import from this file, ensuring type consistency across the entire application.

## Session Types

### `Session`

Represents a full chat session including all messages.

```ts
interface Session {
  id: string;
  title: string;
  templateId?: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}
```

### `Message`

A single message within a session.

```ts
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: "voice" | "text";
  timestamp: string;
  isError?: boolean;
}
```

### `SessionMeta`

Session metadata without the full message array — used for listing sessions efficiently.

```ts
type SessionMeta = Omit<Session, "messages"> & {
  messageCount: number;
};
```

## Project Types

### `Project`

A project that groups related sessions together.

```ts
interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}
```

### `ProjectMeta`

Project metadata enriched with a count of associated sessions.

```ts
type ProjectMeta = Project & {
  sessionCount: number;
};
```

## Template Types

### `Template`

A prompt template with its full content.

```ts
interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  source: "local" | "community";
  content: string;
  author?: string;
  version?: string;
  variables?: TemplateVariable[];
  createdAt: string;
  updatedAt: string;
}
```

### `TemplateVariable`

Defines a variable placeholder within a template.

```ts
interface TemplateVariable {
  name: string;
  label: string;
  default?: string;
  required?: boolean;
}
```

### `TemplateMeta`

Template metadata without the content body — used for listing templates.

```ts
type TemplateMeta = Omit<Template, "content">;
```

## Vosk STT Model Types

### `VoskModelManifest`

Describes a Vosk speech-to-text model as listed in the manifest.

```ts
interface VoskModelManifest {
  id: string;
  name: string;
  language: string;
  size: string;
  accuracy: string;
  minRAM: string;
  url: string;
  default: boolean;
}
```

### `VoskModelInfo`

Extends the manifest with runtime status information.

```ts
type VoskModelInfo = VoskModelManifest & {
  downloaded: boolean;
  active: boolean;
};
```

## AI / Settings Types

### `AIProviderConfig`

Configuration for a single AI provider.

```ts
interface AIProviderConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}
```

### `AISettings`

All AI-related settings, supporting multiple providers.

```ts
interface AISettings {
  provider: string;
  providers: Record<string, AIProviderConfig>;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  thinkingEnabled?: boolean;
  planMode?: boolean;
  positivePrompt?: string;
  negativePrompt?: string;
}
```

### `Settings`

Top-level application settings object.

```ts
interface Settings {
  ai: AISettings;
  stt: {
    activeModel: string;
    sampleRate: number;
  };
  general: {
    theme: string;
  };
  onboarding: {
    completed: boolean;
  };
}
```

## WebSocket / STT Event Types

### `TranscriptEvent`

Emitted by the STT WebSocket when speech is recognized.

```ts
interface TranscriptEvent {
  type: "partial" | "final";
  text: string;
}
```

### `STTError`

Emitted when an STT error occurs.

```ts
interface STTError {
  type: "error";
  message: string;
}
```

### `STTReady`

Emitted when the STT WebSocket is ready to receive audio.

```ts
interface STTReady {
  type: "ready";
}
```

## Document Types

### `AttachedDocument`

Represents a document attached to a session message.

```ts
interface AttachedDocument {
  id: string;
  name: string;
  type: string;
  content: string;
  size: number;
}
```

## API Types

### `GenerateRequest`

Request body for the `/api/generate` endpoint.

```ts
interface GenerateRequest {
  systemPrompt: string;
  messages: Message[];
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  thinkingEnabled?: boolean;
}
```

### `ApiResponse<T>`

Standard API success response wrapper.

```ts
interface ApiResponse<T> {
  ok: true;
  data: T;
}
```

### `ApiError`

Standard API error response.

```ts
interface ApiError {
  ok: false;
  error: string;
}
```
