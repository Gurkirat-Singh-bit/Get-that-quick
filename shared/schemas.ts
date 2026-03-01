/**
 * @fileoverview Zod schemas for runtime validation.
 *
 * Provides runtime type validation for API requests, file I/O,
 * and other untrusted data sources. Mirrors the TypeScript types
 * defined in types.ts.
 *
 * Note: This file imports Zod from the server's node_modules.
 * The TypeScript error is a false positive - it resolves correctly
 * at runtime since this is only used server-side.
 *
 * @module shared/schemas
 */

// @ts-expect-error - Zod is in server's node_modules, not shared/
import { z } from "zod";

// ── Sessions ──────────────────────────────────────────────────────────────

/** Zod schema for validating message objects. */
export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  source: z.enum(["voice", "text"]).optional(),
  timestamp: z.string().datetime(),
});

/** Zod schema for validating complete session objects. */
export const SessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  templateId: z.string().nullable(),
  projectId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  messages: z.array(MessageSchema),
});

/** Zod schema for session metadata (without full message array). */
export const SessionMetaSchema = SessionSchema.omit({ messages: true }).extend({
  messageCount: z.number().int().nonnegative(),
});

// ── Projects ──────────────────────────────────────────────────────────────
/** Zod schema for project objects. */export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ── Templates ─────────────────────────────────────────────────────────────
/** Zod schema for template variable declarations. */export const TemplateVariableSchema = z.object({
  name: z.string(),
  label: z.string(),
  default: z.string().optional(),
  required: z.boolean().optional(),
});

/** Zod schema for complete template objects with content. */
export const TemplateSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  source: z.enum(["local", "community"]),
  content: z.string(),
  author: z.string().optional(),
  version: z.string().optional(),
  variables: z.array(TemplateVariableSchema).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/** Zod schema for template metadata (without full content). */
export const TemplateMetaSchema = TemplateSchema.omit({ content: true });

// ── Settings ──────────────────────────────────────────────────────────────
/** Zod schema for AI provider configuration. */export const AIProviderConfigSchema = z.object({
  apiKey: z.string(),
  model: z.string().min(1),
  baseUrl: z.string().url(),
});

/** Zod schema for AI-specific settings. */
export const AISettingsSchema = z.object({
  provider: z.string().min(1),
  providers: z.record(z.string(), AIProviderConfigSchema),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().nonnegative().optional(),
  thinkingEnabled: z.boolean().optional(),
  planMode: z.boolean().optional(),
  positivePrompt: z.string().optional(),
  negativePrompt: z.string().optional(),
});

/** Zod schema for complete application settings. */
export const SettingsSchema = z.object({
  ai: AISettingsSchema,
  stt: z.object({
    activeModel: z.string(),
    sampleRate: z.number().int().positive(),
  }),
  general: z.object({
    theme: z.enum(["dark", "light"]),
  }),
  onboarding: z.object({
    completed: z.boolean(),
  }),
});

// ── API Requests ──────────────────────────────────────────────────────────

/** Zod schema for LLM generation API requests. */
export const GenerateRequestSchema = z.object({
  systemPrompt: z.string().min(1),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ).min(1),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().nonnegative().optional(),
  thinkingEnabled: z.boolean().optional(),
  stream: z.boolean().optional(),
});

/** Zod schema for creating a new session. */
export const CreateSessionRequestSchema = z.object({
  title: z.string().optional(),
  templateId: z.string().optional(),
});

/** Zod schema for updating an existing session. */
export const UpdateSessionRequestSchema = SessionSchema.partial().required({ id: true });

/** Zod schema for creating a new template. */
export const CreateTemplateRequestSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/** Zod schema for updating an existing template. */
export const UpdateTemplateRequestSchema = TemplateSchema.partial().required({ id: true });

// ── WebSocket Events ──────────────────────────────────────────────────────
/** Zod discriminated union schema for STT WebSocket events. */export const TranscriptEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("partial"),
    text: z.string(),
  }),
  z.object({
    type: z.literal("final"),
    text: z.string(),
  }),
  z.object({
    type: z.literal("error"),
    message: z.string(),
  }),
]);

// ── Type inference helpers ────────────────────────────────────────────────

export type Message = z.infer<typeof MessageSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type SessionMeta = z.infer<typeof SessionMetaSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Template = z.infer<typeof TemplateSchema>;
export type TemplateMeta = z.infer<typeof TemplateMetaSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
export type TranscriptEvent = z.infer<typeof TranscriptEventSchema>;
