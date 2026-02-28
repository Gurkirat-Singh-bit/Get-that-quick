/**
 * @fileoverview React hook for session (chat) management.
 *
 * Provides CRUD operations on sessions backed by the server API,
 * with local state for the active session and optimistic UI updates.
 *
 * @module hooks/use-sessions
 */

import { useState, useEffect, useCallback } from "react";
import type { Session, SessionMeta, Message } from "@shared/types";
import * as api from "@/api/client";

/** Return type of {@link useSessions}. */
export interface UseSessionsReturn {
  /** All session metadata entries (newest first). */
  sessions: SessionMeta[];
  /** The currently active/selected session (with messages), or `null`. */
  activeSession: Session | null;
  /** Whether the sessions list is loading. */
  loading: boolean;
  /** Select a session by ID – fetches full message history. */
  selectSession: (id: string) => Promise<void>;
  /** Create a new session, optionally linked to a template. */
  createSession: (title?: string, templateId?: string) => Promise<Session>;
  /** Delete a session by ID. */
  deleteSession: (id: string) => Promise<void>;
  /** Rename a session. */
  renameSession: (id: string, title: string) => Promise<void>;
  /** Append a user message and get a streamed assistant reply. */
  sendMessage: (content: string) => Promise<void>;
  /** Whether the assistant is currently generating a response. */
  generating: boolean;
  /** Refresh the session list from the server. */
  refresh: () => Promise<void>;
  /** Move a session into or out of a project (client-side only). */
  moveSession: (sessionId: string, projectId: string | null) => void;
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

  /**
   * Send a user message and stream the assistant's reply.
   *
   * Appends the user message optimistically, then streams the LLM
   * response chunk-by-chunk into the UI.  On completion the full
   * session is persisted to the server.
   *
   * @param content - The user's message text.
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeSession || generating) return;

      const userMsg: Message = {
        id: `msg_${Date.now()}`,
        role: "user",
        content,
        source: "text",
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...activeSession.messages, userMsg];
      setActiveSession((prev) =>
        prev ? { ...prev, messages: updatedMessages } : null
      );

      setGenerating(true);

      try {
        // Build the assistant message placeholder
        const assistantMsg: Message = {
          id: `msg_${Date.now() + 1}`,
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
        };

        const withAssistant = [...updatedMessages, assistantMsg];
        setActiveSession((prev) =>
          prev ? { ...prev, messages: withAssistant } : null
        );

        // Determine system prompt from template if set
        let systemPrompt = `You are GetThatQuick — a fast, precise, and knowledgeable AI assistant built into a self-hosted prompt workbench.

Your core principles:
- Be concise and direct. Skip filler phrases.
- When asked to code, produce clean, production-ready code with brief explanations.
- Use markdown formatting: headings, lists, code blocks, tables when helpful.
- If unsure, say so honestly rather than guessing.
- For complex tasks, break them into numbered steps.
- Always prioritize accuracy over verbosity.

You are running locally on the user's machine, so you can be candid and technical.`;
        if (activeSession.templateId) {
          try {
            const tmpl = await api.getTemplate(activeSession.templateId);
            systemPrompt = tmpl.content;
          } catch {
            // fall back to default
          }
        }

        // Stream the response
        const conversationMsgs = updatedMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        let fullContent = "";

        for await (const chunk of api.generateStream({
          systemPrompt,
          messages: conversationMsgs,
          stream: true,
        })) {
          fullContent += chunk;
          setActiveSession((prev) => {
            if (!prev) return null;
            const msgs = [...prev.messages];
            const lastIdx = msgs.length - 1;
            msgs[lastIdx] = { ...msgs[lastIdx], content: fullContent };
            return { ...prev, messages: msgs };
          });
        }

        // Persist the complete conversation to the server
        const finalMessages = [
          ...updatedMessages,
          { ...assistantMsg, content: fullContent },
        ];

        await api.updateSession(activeSession.id, {
          messages: finalMessages,
        } as Partial<Session>);

        await refresh();
      } catch (err) {
        console.error("[useSessions] Generate failed:", err);
        // Add error message
        setActiveSession((prev) => {
          if (!prev) return null;
          const msgs = [...prev.messages];
          const lastIdx = msgs.length - 1;
          msgs[lastIdx] = {
            ...msgs[lastIdx],
            content:
              "⚠️ Failed to get a response. Check that the server is running and an LLM provider is configured.",
          };
          return { ...prev, messages: msgs };
        });
      } finally {
        setGenerating(false);
      }
    },
    [activeSession, generating, refresh]
  );

  /**
   * Move a session into or out of a project.
   * Updates local state optimistically (projectId lives client-side for now).
   */
  const moveSession = useCallback(
    (sessionId: string, projectId: string | null) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, projectId } : s))
      );
      if (activeSession?.id === sessionId) {
        setActiveSession((prev) => (prev ? { ...prev, projectId } : null));
      }
    },
    [activeSession]
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
    refresh,
    moveSession,
  };
}
