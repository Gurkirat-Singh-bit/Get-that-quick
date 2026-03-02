/**
 * @fileoverview React hook for session (chat) management.
 *
 * Provides CRUD operations on sessions backed by the server API,
 * with local state for the active session and optimistic UI updates.
 *
 * @module hooks/use-sessions
 * @license CC BY-NC 4.0 — {@link https://creativecommons.org/licenses/by-nc/4.0/}
 * @author Gurkirat Singh
 * @created 2026-02-25
 * @updated 2026-03-03
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { Session, SessionMeta, Message, Settings, AttachedDocument } from "@shared/types";
import * as api from "@/api/client";

/** Return type of {@link useSessions}. */
export interface UseSessionsReturn {
  sessions: SessionMeta[];
  activeSession: Session | null;
  loading: boolean;
  selectSession: (id: string) => Promise<void>;
  createSession: (title?: string, templateId?: string) => Promise<Session>;
  deleteSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  /** Regenerate the last assistant response. */
  regenerateLastResponse: () => Promise<void>;
  /** Expand the last assistant response (ask for more detail). */
  expandLastResponse: () => Promise<void>;
  /** Refine/improve the last assistant response. */
  refineLastResponse: () => Promise<void>;
  generating: boolean;
  /** Stop an in-progress generation. */
  stopGeneration: () => void;
  refresh: () => Promise<void>;
  moveSession: (sessionId: string, projectId: string | null) => void;
  /** Inject settings ref so sendMessage can read system prompt / temperature. */
  setSettings: (s: Settings | null) => void;
  /** Inject documents ref so sendMessage can include document context. */
  setDocuments: (docs: AttachedDocument[]) => void;
  /** Edit a message's content (re-generates assistant if user msg). */
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  /** Delete a message from the conversation. */
  deleteMessage: (messageId: string) => Promise<void>;
}

/**
 * Hook that manages the session lifecycle.
 *
 * @returns {UseSessionsReturn} Session state and actions.
 */
export function useSessions(): UseSessionsReturn {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const settingsRef = useRef<Settings | null>(null);
  const documentsRef = useRef<AttachedDocument[]>([]);
  const activeSessionRef = useRef<Session | null>(null);
  /** AbortController for the current generation request. */
  const abortControllerRef = useRef<AbortController | null>(null);

  const setSettings = useCallback((s: Settings | null) => {
    settingsRef.current = s;
  }, []);

  const setDocuments = useCallback((docs: AttachedDocument[]) => {
    documentsRef.current = docs;
  }, []);

  /** Keep activeSessionRef in sync. */
  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  /** Reload the session list from the server. */
  const refresh = useCallback(async () => {
    try {
      const data = await api.listSessions();
      setSessions(data);
    } catch (err) {
      console.error("[useSessions] Failed to list sessions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Select a session and load its full message history.
   *
   * @param id - Session identifier.
   */
  const selectSession = useCallback(async (id: string) => {
    try {
      const session = await api.getSession(id);
      activeSessionRef.current = session;
      setActiveSession(session);
    } catch (err) {
      console.error("[useSessions] Failed to get session:", err);
    }
  }, []);

  /**
   * Create a new session.
   *
   * @param title      - Display title.
   * @param templateId - Optional template to pre-load.
   * @returns The created session.
   */
  const createSession = useCallback(
    async (title?: string, templateId?: string) => {
      const session = await api.createSession({ title, templateId });
      activeSessionRef.current = session; // Update ref immediately for race-free sendMessage
      setActiveSession(session);
      await refresh();
      return session;
    },
    [refresh]
  );

  /**
   * Delete a session. If it was active, clears the active session.
   *
   * @param id - Session to delete.
   */
  const deleteSession = useCallback(
    async (id: string) => {
      await api.deleteSession(id);
      if (activeSession?.id === id) setActiveSession(null);
      await refresh();
    },
    [activeSession, refresh]
  );

  /**
   * Rename a session.
   *
   * @param id    - Session to rename.
   * @param title - New title.
   */
  const renameSession = useCallback(
    async (id: string, title: string) => {
      await api.updateSession(id, { title } as Partial<Session>);
      await refresh();
      if (activeSession?.id === id) {
        setActiveSession((prev) => (prev ? { ...prev, title } : null));
      }
    },
    [activeSession, refresh]
  );

  const DEFAULT_SYSTEM_PROMPT = `You are GetThatQuick — a fast, precise, and knowledgeable AI assistant.

## Core Behavior
- Answer directly. No preambles like "I'll help you" or "Let me explain".
- Be extremely concise. Get straight to the point.
- When asked to do something, just do it. Don't ask permission or clarifying questions unless the request is genuinely ambiguous.
- No elaborate thinking sections. Think internally, respond externally.
- For code: produce clean, working code with minimal explanation.
- Format: markdown, code blocks, lists. Keep it scannable.

## Never Do
- Don't generate "Thinking" sections or internal monologue
- Don't ask multiple clarifying questions for simple requests
- Don't explain what you're about to do before doing it
- Don't be verbose when brief will do

You're running locally. Be direct and technical.`;

  /** Get the system prompt — from settings, template, or default. Injects document context and plan mode. */
  const getSystemPrompt = useCallback(
    async (session: Session): Promise<string> => {
      let base: string;
      if (session.templateId) {
        try {
          const tmpl = await api.getTemplate(session.templateId);
          base = tmpl.content;
        } catch {
          base = settingsRef.current?.ai?.systemPrompt || DEFAULT_SYSTEM_PROMPT;
        }
      } else {
        base = settingsRef.current?.ai?.systemPrompt || DEFAULT_SYSTEM_PROMPT;
      }

      // Inject plan mode instructions
      if (settingsRef.current?.ai?.planMode) {
        base += `\n\n## Plan Mode — Interactive Clarification
You are in PLAN MODE. Before giving your final answer, you MUST first ask the user clarifying questions to fully understand their needs.

Rules:
1. Analyze the user's request and any attached documents thoroughly.
2. Identify ambiguities, missing details, or important choices the user should make.
3. Ask 2-5 focused clarifying questions, each with 3-6 selectable options.
4. Format your questions using EXACTLY this structure (the UI will render them as clickable buttons):

<<PLAN_QUESTION>>
Your question text here?
- Option A
- Option B
- Option C
- Option D
<<END_QUESTION>>

5. You may include brief context text before or between questions.
6. After the user answers, you may ask follow-up questions if needed, or provide your final comprehensive response.
7. When you have enough information and are ready to give the final answer, just respond normally without the <<PLAN_QUESTION>> format.
8. Each question MUST have at least 2 options and at most 6 options.
9. Keep questions concise and options clear.`;
      }

      // Inject attached document context
      const docs = documentsRef.current;
      if (docs.length > 0) {
        base += "\n\n## Attached Documents\nThe user has provided the following documents as context. Reference them when relevant:\n";
        for (const doc of docs) {
          base += `\n### ${doc.name}\n\`\`\`\n${doc.content}\n\`\`\`\n`;
        }
      }

      // Inject positive prompt (emphasize)
      const positivePrompt = settingsRef.current?.ai?.positivePrompt?.trim();
      if (positivePrompt) {
        base += `\n\n## Positive Guidance\nThe user wants you to EMPHASIZE the following:\n${positivePrompt}`;
      }

      // Inject negative prompt (avoid)
      const negativePrompt = settingsRef.current?.ai?.negativePrompt?.trim();
      if (negativePrompt) {
        base += `\n\n## Negative Guidance\nThe user wants you to AVOID the following:\n${negativePrompt}`;
      }

      return base;
    },
    []
  );

  /** Auto-name a session after initial messages by asking the LLM. */
  const autoNameSession = useCallback(
    async (sessionId: string, messages: Message[]) => {
      try {
        const userMsgs = messages.filter((m) => m.role === "user").map((m) => m.content).join("\n");
        const title = await api.generate({
          systemPrompt: "Generate a short, concise title (max 6 words) for a chat conversation based on the user's messages below. Reply with ONLY the title text, no quotes, no explanation.",
          messages: [{ role: "user", content: userMsgs }],
          temperature: 0.3,
          maxTokens: 30,
        });

        const clean = title.replace(/^["']|["']$/g, "").trim();
        if (clean && clean.length > 0 && clean.length < 80) {
          await api.updateSession(sessionId, { title: clean } as Partial<Session>);
          setActiveSession((prev) => (prev?.id === sessionId ? { ...prev, title: clean } : prev));
          await refresh();
        }
      } catch (err) {
        console.warn("[useSessions] Auto-name failed:", err);
      }
    },
    [refresh]
  );

  /** Core streaming helper — shared by sendMessage, regenerate, expand, refine. */
  const streamAssistantResponse = useCallback(
    async (
      session: Session,
      conversationMessages: Message[],
      systemPrompt: string
    ): Promise<string> => {
      const settings = settingsRef.current;
      const assistantMsg: Message = {
        id: `msg_${Date.now() + 1}`,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
      };

      const withAssistant = [...conversationMessages, assistantMsg];
      setActiveSession((prev) =>
        prev ? { ...prev, messages: withAssistant } : null
      );

      let fullContent = "";

      // Create a fresh AbortController for this generation
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        for await (const chunk of api.generateStream({
          systemPrompt,
          messages: conversationMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: settings?.ai?.temperature ?? 0.7,
          maxTokens: settings?.ai?.maxTokens || undefined,
          thinkingEnabled: settings?.ai?.thinkingEnabled ?? false,
        }, controller.signal)) {
          fullContent += chunk;
          setActiveSession((prev) => {
            if (!prev) return null;
            const msgs = [...prev.messages];
            const lastIdx = msgs.length - 1;
            msgs[lastIdx] = { ...msgs[lastIdx], content: fullContent };
            return { ...prev, messages: msgs };
          });
        }
      } finally {
        abortControllerRef.current = null;
      }

      // If the generation was stopped by the user, persist whatever was
      // streamed so far but skip the refresh to avoid re-render flicker.
      if (controller.signal.aborted) {
        if (fullContent) {
          const partial = [
            ...conversationMessages,
            { ...assistantMsg, content: fullContent },
          ];
          await api.updateSession(session.id, { messages: partial } as Partial<Session>);
        }
        return fullContent;
      }

      // Normal completion — persist and refresh session list.
      const finalMessages = [
        ...conversationMessages,
        { ...assistantMsg, content: fullContent },
      ];
      await api.updateSession(session.id, {
        messages: finalMessages,
      } as Partial<Session>);
      await refresh();

      return fullContent;
    },
    [refresh]
  );

  /**
   * Send a user message and stream the assistant's reply.
   */
  const sendMessage = useCallback(
    async (content: string) => {
      const session = activeSessionRef.current;
      if (!session || generating) return;

      const userMsg: Message = {
        id: `msg_${Date.now()}`,
        role: "user",
        content,
        source: "text",
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...session.messages, userMsg];
      setActiveSession((prev) =>
        prev ? { ...prev, messages: updatedMessages } : null
      );

      setGenerating(true);

      try {
        const systemPrompt = await getSystemPrompt(session);
        await streamAssistantResponse(session, updatedMessages, systemPrompt);

        // Auto-name the chat after first user message if still default title
        const userCount = updatedMessages.filter((m) => m.role === "user").length;
        if (
          userCount >= 1 &&
          (session.title === "New Session" || session.title === "New Chat")
        ) {
          autoNameSession(session.id, updatedMessages);
        }
      } catch (err) {
        // Abort is a clean stop — don't show an error to the user
        if (err instanceof DOMException && err.name === "AbortError") return;

        console.error("[useSessions] Generate failed:", err);

        let errorMsg = "Failed to get a response. Check that the server is running and an LLM provider is configured.";
        if (err instanceof api.ApiClientError) {
          if (err.isNetworkError) {
            errorMsg = "Network error: Cannot reach the server. Check your connection.";
          } else {
            // Use the real error message from the provider (e.g. OpenRouter response)
            errorMsg = err.message || errorMsg;
          }
        }

        setActiveSession((prev) => {
          if (!prev) return null;
          const msgs = [...prev.messages];
          const lastIdx = msgs.length - 1;
          msgs[lastIdx] = { ...msgs[lastIdx], content: errorMsg, isError: true };
          return { ...prev, messages: msgs };
        });
      } finally {
        setGenerating(false);
      }
    },
    [generating, getSystemPrompt, streamAssistantResponse, autoNameSession]
  );

  /** Stop the currently running generation. */
  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setGenerating(false);
  }, []);

  /** Regenerate the last assistant response. */
  const regenerateLastResponse = useCallback(async () => {
    if (!activeSession || generating) return;
    const msgs = activeSession.messages;
    // Remove the last assistant message
    const lastAssistantIdx = msgs.length - 1;
    if (lastAssistantIdx < 0 || msgs[lastAssistantIdx].role !== "assistant") return;

    const withoutLast = msgs.slice(0, lastAssistantIdx);
    setActiveSession((prev) => prev ? { ...prev, messages: withoutLast } : null);
    setGenerating(true);

    try {
      const systemPrompt = await getSystemPrompt(activeSession);
      await streamAssistantResponse(activeSession, withoutLast, systemPrompt);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError"))
        console.error("[useSessions] Regenerate failed:", err);
    } finally {
      setGenerating(false);
    }
  }, [activeSession, generating, getSystemPrompt, streamAssistantResponse]);

  /** Expand the last assistant response. */
  const expandLastResponse = useCallback(async () => {
    if (!activeSession || generating) return;
    const msgs = activeSession.messages;
    const lastAssistant = msgs[msgs.length - 1];
    if (!lastAssistant || lastAssistant.role !== "assistant") return;

    // Append a follow-up user message asking to expand
    const expandMsg: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: "Please expand on your previous response with more details, examples, and depth.",
      source: "text",
      timestamp: new Date().toISOString(),
    };

    const updated = [...msgs, expandMsg];
    setActiveSession((prev) => prev ? { ...prev, messages: updated } : null);
    setGenerating(true);

    try {
      const systemPrompt = await getSystemPrompt(activeSession);
      await streamAssistantResponse(activeSession, updated, systemPrompt);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError"))
        console.error("[useSessions] Expand failed:", err);
    } finally {
      setGenerating(false);
    }
  }, [activeSession, generating, getSystemPrompt, streamAssistantResponse]);

  /** Refine the last assistant response. */
  const refineLastResponse = useCallback(async () => {
    if (!activeSession || generating) return;
    const msgs = activeSession.messages;
    const lastAssistant = msgs[msgs.length - 1];
    if (!lastAssistant || lastAssistant.role !== "assistant") return;

    // Append a follow-up user message asking to refine
    const refineMsg: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: "Please refine and improve your previous response. Make it clearer, more accurate, and better structured.",
      source: "text",
      timestamp: new Date().toISOString(),
    };

    const updated = [...msgs, refineMsg];
    setActiveSession((prev) => prev ? { ...prev, messages: updated } : null);
    setGenerating(true);

    try {
      const systemPrompt = await getSystemPrompt(activeSession);
      await streamAssistantResponse(activeSession, updated, systemPrompt);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError"))
        console.error("[useSessions] Refine failed:", err);
    } finally {
      setGenerating(false);
    }
  }, [activeSession, generating, getSystemPrompt, streamAssistantResponse]);

  /**
   * Move a session into or out of a project.
   * Updates local state optimistically and persists to server.
   */
  const moveSession = useCallback(
    (sessionId: string, projectId: string | null) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, projectId } : s))
      );
      if (activeSession?.id === sessionId) {
        setActiveSession((prev) => (prev ? { ...prev, projectId } : null));
      }
      // Persist to server
      api.updateSession(sessionId, { projectId } as Partial<Session>).catch((err) =>
        console.warn("[useSessions] Failed to persist projectId:", err)
      );
    },
    [activeSession]
  );

  /**
   * Edit a message's content. Updates local + server state.
   * If a user message is edited, removes all messages after it
   * and re-sends to get a new assistant response.
   */
  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      if (!activeSession || generating) return;
      const msgIdx = activeSession.messages.findIndex((m) => m.id === messageId);
      if (msgIdx === -1) return;

      const msg = activeSession.messages[msgIdx];

      // Truncate conversation at this message and update its content
      const truncated = activeSession.messages.slice(0, msgIdx);
      const updatedMsg: Message = { ...msg, content: newContent };
      const newMessages = [...truncated, updatedMsg];

      // Persist truncated messages
      setActiveSession((prev) => prev ? { ...prev, messages: newMessages } : null);
      await api.updateSession(activeSession.id, { messages: newMessages });

      // If it was a user message, re-generate the assistant response
      if (msg.role === "user") {
        setGenerating(true);
        try {
          const systemPrompt = await getSystemPrompt(activeSession);
          const fullContent = await streamAssistantResponse(
            activeSession,
            newMessages,
            systemPrompt
          );

          const finalMessages = [
            ...newMessages,
            {
              id: `msg_${Date.now() + 1}`,
              role: "assistant" as const,
              content: fullContent,
              timestamp: new Date().toISOString(),
            },
          ];

          await api.updateSession(activeSession.id, { messages: finalMessages });
          setActiveSession((prev) =>
            prev ? { ...prev, messages: finalMessages } : null
          );
        } finally {
          setGenerating(false);
        }
      }

      await refresh();
    },
    [activeSession, generating, getSystemPrompt, streamAssistantResponse, refresh]
  );

  /**
   * Delete a specific message from the conversation.
   * If deleting a user message, also removes the following assistant response.
   */
  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!activeSession || generating) return;
      const msgIdx = activeSession.messages.findIndex((m) => m.id === messageId);
      if (msgIdx === -1) return;

      const msg = activeSession.messages[msgIdx];
      let newMessages: Message[];

      if (msg.role === "user") {
        // Delete user message + the following assistant response if it exists
        const nextMsg = activeSession.messages[msgIdx + 1];
        if (nextMsg?.role === "assistant") {
          newMessages = [
            ...activeSession.messages.slice(0, msgIdx),
            ...activeSession.messages.slice(msgIdx + 2),
          ];
        } else {
          newMessages = [
            ...activeSession.messages.slice(0, msgIdx),
            ...activeSession.messages.slice(msgIdx + 1),
          ];
        }
      } else {
        // Just delete the assistant message
        newMessages = [
          ...activeSession.messages.slice(0, msgIdx),
          ...activeSession.messages.slice(msgIdx + 1),
        ];
      }

      setActiveSession((prev) => prev ? { ...prev, messages: newMessages } : null);
      await api.updateSession(activeSession.id, { messages: newMessages });
      await refresh();
    },
    [activeSession, generating, refresh]
  );

  return {
    sessions,
    activeSession,
    loading,
    selectSession,
    createSession,
    deleteSession,
    renameSession,
    sendMessage,
    generating,
    stopGeneration,
    refresh,
    moveSession,
    regenerateLastResponse,
    expandLastResponse,
    refineLastResponse,
    setSettings,
    setDocuments,
    editMessage,
    deleteMessage,
  };
}
