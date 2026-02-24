// ── Shared types between client & server ──────────────────────────────────

// ── Sessions ──────────────────────────────────────────────────────────────

export interface Session {
  id: string;
  title: string;
  templateId: string | null;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** How the user message was created — only set for role=user */
  source?: "voice" | "text";
  timestamp: string;
}

export type SessionMeta = Omit<Session, "messages"> & {
  messageCount: number;
};

// ── Templates ─────────────────────────────────────────────────────────────

export interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  /** "local" = user-created, "community" = from remote repo */
  source: "local" | "community";
  /** The actual system prompt content (markdown body) */
  content: string;
  createdAt: string;
  updatedAt: string;
}

export type TemplateMeta = Omit<Template, "content">;

// ── Vosk Models ───────────────────────────────────────────────────────────

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

export interface VoskModelInfo extends VoskModelManifest {
  downloaded: boolean;
  active: boolean;
}

// ── Settings ──────────────────────────────────────────────────────────────

export interface AIProviderConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface Settings {
  ai: {
    provider: string;
    providers: Record<string, AIProviderConfig>;
  };
  stt: {
    activeModel: string;
    sampleRate: number;
  };
  general: {
    theme: "dark" | "light";
  };
  onboarding: {
    completed: boolean;
  };
}

// ── WebSocket STT events ──────────────────────────────────────────────────

export interface TranscriptEvent {
  type: "partial" | "final";
  text: string;
}

export interface STTError {
  type: "error";
  message: string;
}

// ── Generate API ──────────────────────────────────────────────────────────

export interface GenerateRequest {
  systemPrompt: string;
  messages: { role: "user" | "assistant"; content: string }[];
  stream?: boolean;
}

// ── API response wrappers ─────────────────────────────────────────────────

export interface ApiResponse<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: string;
}
