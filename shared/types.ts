/**
 * @fileoverview Shared type definitions for client and server.
 *
 * All interfaces used across the monorepo live here so that both
 * the Hono server and React client share a single source of truth.
 *
 * @module shared/types
 */

// ── Sessions ──────────────────────────────────────────────────────────────

/** A full chat session including its message history. */
export interface Session {
  /** Unique session identifier (nanoid). */
  id: string;
  /** User-visible session title. */
  title: string;
  /** Optional template that seeded the system prompt. */
  templateId: string | null;
  /** Optional project grouping. */
  projectId: string | null;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** ISO-8601 last-update timestamp. */
  updatedAt: string;
  /** Ordered list of messages in this session. */
  messages: Message[];
}

/** A single message within a session. */
export interface Message {
  /** Unique message identifier. */
  id: string;
  /** Whether this message is from the user or the assistant. */
  role: "user" | "assistant";
  /** The message text content (may contain markdown). */
  content: string;
  /** How the user message was created — only set for role=user. */
  source?: "voice" | "text";
  /** ISO-8601 timestamp of when the message was created. */
  timestamp: string;
}

/** Session metadata without the full message array. */
export type SessionMeta = Omit<Session, "messages"> & {
  /** Number of messages in the session. */
  messageCount: number;
};

// ── Projects ──────────────────────────────────────────────────────────────

/** A project groups related chat sessions together. */
export interface Project {
  /** Unique project identifier (nanoid). */
  id: string;
  /** User-visible project name. */
  name: string;
  /** Optional description. */
  description: string;
  /** Accent color hex for the project label. */
  color: string;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** ISO-8601 last-update timestamp. */
  updatedAt: string;
}

/** Project metadata with session count. */
export type ProjectMeta = Project & {
  /** Number of sessions in this project. */
  sessionCount: number;
};

// ── Templates ─────────────────────────────────────────────────────────────

/** A prompt template with metadata and content. */
export interface Template {
  /** Unique template identifier (nanoid). */
  id: string;
  /** Human-readable title. */
  title: string;
  /** Short description of the template's purpose. */
  description: string;
  /** Category tag (e.g. "code", "writing"). */
  category: string;
  /** Searchable tags. */
  tags: string[];
  /** "local" = user-created, "community" = from remote repo. */
  source: "local" | "community";
  /** The actual system prompt content (markdown body). */
  content: string;
  /** Author name or handle. */
  author?: string;
  /** Semver version string (e.g. "1.0.0"). */
  version?: string;
  /** Declared template variables — placeholders in the prompt body. */
  variables?: TemplateVariable[];
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** ISO-8601 last-update timestamp. */
  updatedAt: string;
}

/** A variable placeholder declared in a template's YAML heading. */
export interface TemplateVariable {
  /** Variable name — referenced as {{name}} in the prompt body. */
  name: string;
  /** Human-readable label shown in the UI. */
  label: string;
  /** Default value if the user doesn't provide one. */
  default?: string;
  /** Whether the variable must be filled before running. */
  required?: boolean;
}

/** Template metadata without the full content body. */
export type TemplateMeta = Omit<Template, "content">;

// ── Vosk Models ───────────────────────────────────────────────────────────

/** Manifest entry for a downloadable Vosk STT model. */
export interface VoskModelManifest {
  id: string;
  name: string;
  language: string;
  size: string;
  accuracy: string;
  minRAM: string;
  url: string;
  default: boolean;
}

/** Extended Vosk model info with local status. */
export interface VoskModelInfo extends VoskModelManifest {
  /** Whether the model has been downloaded locally. */
  downloaded: boolean;
  /** Whether this model is currently active for STT. */
  active: boolean;
}

// ── Settings ──────────────────────────────────────────────────────────────

/** Configuration for a single AI provider endpoint. */
export interface AIProviderConfig {
  /** API key (may be empty for local providers). */
  apiKey: string;
  /** Default model identifier for this provider. */
  model: string;
  /** Base URL of the OpenAI-compatible API. */
  baseUrl: string;
}

/** Application-wide settings persisted on disk. */
export interface Settings {
  /** AI / LLM configuration. */
  ai: {
    /** Name of the currently active provider. */
    provider: string;
    /** Map of provider name → config. */
    providers: Record<string, AIProviderConfig>;
  };
  /** Speech-to-text configuration. */
  stt: {
    /** Active Vosk model identifier. */
    activeModel: string;
    /** Audio sample rate in Hz. */
    sampleRate: number;
  };
  /** General UI preferences. */
  general: {
    /** Active theme. */
    theme: "dark" | "light";
  };
  /** Onboarding wizard state. */
  onboarding: {
    /** Whether the user has completed the onboarding flow. */
    completed: boolean;
  };
}

// ── WebSocket STT events ──────────────────────────────────────────────────

/** Partial transcript event from the STT WebSocket. */
export interface TranscriptEvent {
  /** "partial" for in-progress, "final" for completed utterance. */
  type: "partial" | "final";
  /** The transcribed text. */
  text: string;
}

/** Error event from the STT WebSocket. */
export interface STTError {
  type: "error";
  /** Human-readable error description. */
  message: string;
}

// ── Generate API ──────────────────────────────────────────────────────────

/** Request body for the /api/generate endpoint. */
export interface GenerateRequest {
  /** System prompt to prepend. */
  systemPrompt: string;
  /** Conversation history. */
  messages: { role: "user" | "assistant"; content: string }[];
  /** Whether to stream the response via SSE. */
  stream?: boolean;
}

// ── API response wrappers ─────────────────────────────────────────────────

/** Successful API response envelope. */
export interface ApiResponse<T> {
  ok: true;
  /** The response payload. */
  data: T;
}

/** Error API response envelope. */
export interface ApiError {
  ok: false;
  /** Human-readable error message. */
  error: string;
}
