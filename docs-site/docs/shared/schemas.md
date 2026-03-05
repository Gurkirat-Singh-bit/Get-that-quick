---
sidebar_position: 2
title: Zod Schemas
---

# Zod Schemas

`shared/schemas.ts` provides **Zod runtime validation schemas** used server-side to validate incoming request bodies and data structures. These schemas mirror the TypeScript interfaces in `shared/types.ts` but add runtime validation constraints.

:::note
Since `shared/schemas.ts` lives outside `server/`, but Zod is installed in `server/node_modules`, the import uses a `@ts-expect-error` directive:

```ts
// @ts-expect-error — Zod resolved from server/node_modules
import { z } from "zod";
```

This is a deliberate trade-off to keep shared code in one place while only installing Zod on the server side.
:::

## Core Data Schemas

### `MessageSchema`

Validates a single chat message.

```ts
const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  source: z.enum(["voice", "text"]).optional(),
  timestamp: z.string(),
  isError: z.boolean().optional(),
});
```

### `SessionSchema`

Validates a full session including messages.

```ts
const SessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  templateId: z.string().optional(),
  projectId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messages: z.array(MessageSchema),
});
```

### `SessionMetaSchema`

Validates session metadata (without messages).

```ts
const SessionMetaSchema = SessionSchema.omit({ messages: true }).extend({
  messageCount: z.number(),
});
```

### `ProjectSchema`

Validates a project.

```ts
const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  color: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
```

## Template Schemas

### `TemplateVariableSchema`

Validates a single template variable definition.

```ts
const TemplateVariableSchema = z.object({
  name: z.string(),
  label: z.string(),
  default: z.string().optional(),
  required: z.boolean().optional(),
});
```

### `TemplateSchema`

Validates a full template including content.

```ts
const TemplateSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  source: z.enum(["local", "community"]),
  content: z.string(),
  author: z.string().optional(),
  version: z.string().optional(),
  variables: z.array(TemplateVariableSchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
```

### `TemplateMetaSchema`

Validates template metadata (without content).

```ts
const TemplateMetaSchema = TemplateSchema.omit({ content: true });
```

## Settings Schemas

### `AIProviderConfigSchema`

Validates configuration for a single AI provider.

```ts
const AIProviderConfigSchema = z.object({
  apiKey: z.string(),
  model: z.string(),
  baseUrl: z.string(),
});
```

### `AISettingsSchema`

Validates all AI-related settings.

```ts
const AISettingsSchema = z.object({
  provider: z.string(),
  providers: z.record(z.string(), AIProviderConfigSchema),
  systemPrompt: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  thinkingEnabled: z.boolean().optional(),
  planMode: z.boolean().optional(),
  positivePrompt: z.string().optional(),
  negativePrompt: z.string().optional(),
});
```

### `SettingsSchema`

Validates the top-level settings object.

```ts
const SettingsSchema = z.object({
  ai: AISettingsSchema,
  stt: z.object({
    activeModel: z.string(),
    sampleRate: z.number(),
  }),
  general: z.object({
    theme: z.string(),
  }),
  onboarding: z.object({
    completed: z.boolean(),
  }),
});
```

## Request Schemas

These schemas are used to validate incoming HTTP request bodies.

### `GenerateRequestSchema`

```ts
const GenerateRequestSchema = z.object({
  systemPrompt: z.string(),
  messages: z.array(MessageSchema),
  stream: z.boolean().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  thinkingEnabled: z.boolean().optional(),
});
```

### `CreateSessionRequestSchema`

```ts
const CreateSessionRequestSchema = z.object({
  title: z.string().optional(),
  templateId: z.string().optional(),
});
```

### `UpdateSessionRequestSchema`

```ts
const UpdateSessionRequestSchema = SessionSchema.partial();
```

### `CreateTemplateRequestSchema`

```ts
const CreateTemplateRequestSchema = z.object({
  title: z.string(),
  content: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
```

### `UpdateTemplateRequestSchema`

```ts
const UpdateTemplateRequestSchema = TemplateSchema.partial();
```

## WebSocket Event Schema

### `TranscriptEventSchema`

A **discriminated union** on the `type` field, covering all possible STT WebSocket events:

```ts
const TranscriptEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("partial"), text: z.string() }),
  z.object({ type: z.literal("final"), text: z.string() }),
  z.object({ type: z.literal("error"), message: z.string() }),
  z.object({ type: z.literal("ready") }),
]);
```

## Schema ↔ Type Relationship

The Zod schemas parallel the TypeScript interfaces but add **runtime validation constraints** that TypeScript alone cannot enforce. The typical pattern is:

```ts
// Type (compile-time only)
interface Message { ... }

// Schema (runtime validation)
const MessageSchema = z.object({ ... });

// Inferred type matches the interface
type ValidatedMessage = z.infer<typeof MessageSchema>;
```

This ensures that data crossing the network boundary is validated before being used, while the shared TypeScript interfaces keep client and server type-aligned at compile time.
