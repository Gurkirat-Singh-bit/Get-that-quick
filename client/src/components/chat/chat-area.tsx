/**
 * @fileoverview Chat area — main conversation view.
 *
 * Renders the active session's messages with markdown formatting,
 * a top bar showing the session title, and the pinned input bar.
 * When no session is active it shows an empty-state prompt.
 *
 * @module components/chat/chat-area
 */

import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { Sparkles, AlertTriangle, LayoutTemplate } from "lucide-react";
import { Message, parsePlanQuestions } from "@/components/chat/message";
import type { PlanQuestion } from "@/components/chat/message";
import { ChatInput } from "@/components/chat/chat-input";
import type { Session, Settings, AttachedDocument } from "@shared/types";

/** Props accepted by {@link ChatArea}. */
interface ChatAreaProps {
  /** The currently active session (null = empty state). */
  session: Session | null;
  /** Called when the user sends a message. */
  onSend: (content: string) => Promise<void>;
  /** Whether the LLM is currently generating a response. */
  generating: boolean;
  /** Create a brand new chat session. */
  onNewChat: () => Promise<void>;
  /** Convert an assistant response into a template. */
  onSaveAsTemplate?: (content: string) => void;
  /** Current app settings — used to show config warnings. */
  settings: Settings | null;
  /** Persist partial settings updates. */
  onUpdateSettings: (updates: Partial<Settings>) => Promise<void>;
  /** Open the settings overlay. */
  onOpenSettings?: () => void;
  /** Regenerate the last assistant response. */
  onRegenerate?: () => void;
  /** Expand the last assistant response. */
  onExpand?: () => void;
  /** Refine the last assistant response. */
  onRefine?: () => void;
  /** Attached documents for context. */
  documents: AttachedDocument[];
  /** Update attached documents. */
  onDocumentsChange: (docs: AttachedDocument[]) => void;
  /** Edit a message and re-generate assistant response. */
  onEditMessage?: (messageId: string, newContent: string) => void;
  /** Delete a message. */
  onDeleteMessage?: (messageId: string) => void;
  /** Apply a template by starting a new session with it. */
  onApplyTemplate?: (templateId: string) => void;
  /** Name of the active template (resolved from templateId). */
  activeTemplateName?: string | null;
}

/**
 * Main chat area component.
 *
 * @param props - {@link ChatAreaProps}
 */
export function ChatArea({
  session,
  onSend,
  generating,
  onNewChat,
  onSaveAsTemplate,
  settings,
  onUpdateSettings,
  onOpenSettings,
  onRegenerate,
  onExpand,
  onRefine,
  documents,
  onDocumentsChange,
  onEditMessage,
  onDeleteMessage,
  onApplyTemplate,
  activeTemplateName,
}: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  /** Auto-scroll when messages change. */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages]);

  /** Handle template drop. */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/gtq-template")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const templateId = e.dataTransfer.getData("application/gtq-template");
      if (templateId && onApplyTemplate) {
        onApplyTemplate(templateId);
      }
    },
    [onApplyTemplate]
  );

  /** Derive config status flags. */
  const activeProvider = settings?.ai?.provider;
  const providerConfig = activeProvider ? settings?.ai?.providers?.[activeProvider] : null;
  const llmConfigured = !!(providerConfig?.apiKey && providerConfig?.model);
  const sttConfigured = !!settings?.stt?.activeModel;

  /** Handle send from the input bar. */
  const handleSend = async (content: string) => {
    if (!session) {
      // Auto-create a session on first message
      await onNewChat();
    }
    await onSend(content);
  };

  /** Extract plan questions from the last assistant message (if any). */
  const planQuestions: PlanQuestion[] = useMemo(() => {
    if (!session || session.messages.length === 0 || generating) return [];
    // Find the last assistant message
    const lastAssistant = [...session.messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return [];
    const segments = parsePlanQuestions(lastAssistant.content);
    return segments
      .filter((s): s is { type: "question"; data: PlanQuestion } => s.type === "question")
      .map((s) => s.data);
  }, [session?.messages, generating]);

  return (
    <div
      className={`flex-1 flex flex-col min-w-0 h-full relative ${dragOver ? "ring-2 ring-primary/40 ring-inset" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragOver && (
        <div className="absolute inset-0 z-20 bg-primary/5 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-2 bg-white rounded-2xl px-8 py-6 shadow-lg border border-primary/20">
            <LayoutTemplate className="w-8 h-8 text-primary" />
            <p className="text-sm font-semibold text-zinc-700">Drop to start chat with template</p>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[#E2E4E9] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-base font-bold tracking-tight text-zinc-800 truncate">
            {session?.title ?? "New Chat"}
          </h1>
          {activeTemplateName && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium shrink-0">
              <LayoutTemplate className="w-3 h-3" />
              {activeTemplateName}
            </span>
          )}
        </div>
      </div>

      {/* Messages — scrollable middle */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {!session || session.messages.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-zinc-800 mb-1">GetThatQuick</h2>
            <p className="text-sm text-zinc-500 max-w-sm mb-6">
              {activeTemplateName
                ? <>Template <strong>{activeTemplateName}</strong> loaded — type a message to begin.</>
                : "Your self-hosted prompt workbench. Type a message to start a new conversation."
              }
            </p>

            {/* Config warning banners */}
            {settings && (!llmConfigured || !sttConfigured) && (
              <div className="flex flex-col gap-2 max-w-sm w-full">
                {!llmConfigured && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-left transition hover:bg-amber-100"
                  >
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">LLM provider not configured</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Add an API key and select a model in Settings to start chatting.
                      </p>
                    </div>
                  </button>
                )}
                {!sttConfigured && (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-left transition hover:bg-amber-100"
                  >
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Voice model not configured</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Download and activate a Vosk model in Settings to use speech-to-text.
                      </p>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-6">
            {session.messages.map((msg, i) => {
              // Determine if this is the last assistant message
              const isLastAssistant =
                msg.role === "assistant" &&
                session.messages.slice(i + 1).every((m) => m.role !== "assistant");

              return (
                <div key={msg.id}>
                  <Message
                    message={{ id: msg.id, role: msg.role, content: msg.content }}
                    onSaveAsTemplate={msg.role === "assistant" ? onSaveAsTemplate : undefined}
                    onRegenerate={onRegenerate}
                    onExpand={onExpand}
                    onRefine={onRefine}
                    isLastAssistant={isLastAssistant}
                    onEdit={onEditMessage}
                    onDelete={onDeleteMessage}
                  />
                  {i < session.messages.length - 1 && msg.role === "assistant" && (
                    <div className="border-t border-[#E2E4E9] my-1" />
                  )}
                </div>
              );
            })}

            {/* Streaming indicator */}
            {generating && (
              <div className="flex items-center gap-2 py-3 text-xs text-zinc-500">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                Generating…
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input — always pinned at bottom */}
      <ChatInput
        onSend={handleSend}
        disabled={generating}
        documents={documents}
        onDocumentsChange={onDocumentsChange}
        planMode={settings?.ai?.planMode ?? false}
        onTogglePlanMode={() => {
          if (settings) {
            onUpdateSettings({ ai: { ...settings.ai, planMode: !settings.ai.planMode } });
          }
        }}
        planQuestions={planQuestions}
      />
    </div>
  );
}
