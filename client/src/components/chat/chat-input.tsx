/**
 * @fileoverview Chat input bar with send button, Vosk voice dictation,
 * document attachment, and plan/thinking mode toggles.
 *
 * Pinned to the bottom of the chat area. Supports keyboard
 * shortcut (Enter), auto-expanding textarea, and local Vosk STT
 * via WebSocket for fully offline voice input.
 *
 * @module components/chat/chat-input
 * @license CC BY-NC 4.0 — {@link https://creativecommons.org/licenses/by-nc/4.0/}
 * @author Gurkirat Singh
 * @created 2026-02-25
 * @updated 2026-03-03
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, Mic, MicOff, Paperclip, ListChecks, FileText, X, Check, Send, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AttachedDocument } from "@shared/types";
import type { PlanQuestion } from "@/components/chat/message";

/** Props accepted by {@link ChatInput}. */
interface ChatInputProps {
  /** Called with the trimmed message text when the user sends. */
  onSend?: (message: string) => void;
  /** When `true`, input and buttons are disabled (e.g. during generation). */
  disabled?: boolean;
  /** Called when the user clicks the stop button during generation. */
  onStop?: () => void;
  /** Attached documents. */
  documents: AttachedDocument[];
  /** Update attached documents. */
  onDocumentsChange: (docs: AttachedDocument[]) => void;
  /** Whether plan mode is active. */
  planMode: boolean;
  /** Toggle plan mode. */
  onTogglePlanMode: () => void;
  /** Plan questions extracted from the last assistant message. */
  planQuestions?: PlanQuestion[];
}

/** Target sample rate that the Vosk server expects. */
const VOSK_SAMPLE_RATE = 16_000;

/** Accepted file extensions for document upload. */
const ACCEPTED_EXTENSIONS = ".txt,.md,.markdown,.json,.csv,.xml,.yaml,.yml,.html,.htm,.css,.js,.ts,.jsx,.tsx,.py,.rb,.go,.rs,.java,.c,.cpp,.h,.hpp,.sh,.bash,.sql,.env,.toml,.ini,.cfg,.log";

/**
 * Resolve the WebSocket URL for `/ws/stt`.
 */
function getWsUrl(): string {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/ws/stt`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/**
 * Chat input bar with document attachment, voice, and mode toggles.
 */
export function ChatInput({
  onSend,
  disabled = false,
  onStop,
  documents,
  onDocumentsChange,
  planMode,
  onTogglePlanMode,
  planQuestions = [],
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Voice state ──────────────────────────────────────────────────────
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceConnecting, setVoiceConnecting] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const valueRef = useRef(value);
  const baselineRef = useRef("");
  const accumulatedRef = useRef("");
  const stoppingRef = useRef(false);
  /** Set to true once the server sends `{ type: "ready" }` — audio is only sent after then. */
  const serverReadyRef = useRef(false);
  valueRef.current = value;

  /** Auto-resize textarea to content (max 5 lines). */
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => { autoResize(); }, [value, autoResize]);

  /** Submit the current value if non-empty. */
  const handleSend = () => {
    if (!value.trim() || disabled) return;
    onSend?.(value.trim());
    setValue("");
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    });
  };

  /** Enter sends; Shift+Enter for newline. */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── File handling ───────────────────────────────────────────────────
  const handleFiles = async (files: FileList | File[]) => {
    const newDocs: AttachedDocument[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 1_048_576) continue; // max 1MB
      try {
        const content = await file.text();
        newDocs.push({
          id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          type: file.type || "text/plain",
          content,
          size: file.size,
        });
      } catch {
        // Skip unreadable files
      }
    }
    if (newDocs.length > 0) {
      onDocumentsChange([...documents, ...newDocs]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsFocused(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsFocused(true);
  };

  const removeDocument = (id: string) => {
    onDocumentsChange(documents.filter((d) => d.id !== id));
  };

  // ── Audio cleanup ───────────────────────────────────────────────────
  const cleanupAudio = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    if (contextRef.current && contextRef.current.state !== "closed") {
      contextRef.current.close().catch(() => {});
    }
    contextRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const cleanupWs = useCallback(() => {
    if (wsRef.current) {
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }
  }, []);

  // ── Start listening ─────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    setVoiceError(null);
    setVoiceConnecting(true);
    stoppingRef.current = false;
    serverReadyRef.current = false;
    baselineRef.current = valueRef.current;
    accumulatedRef.current = "";

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: VOSK_SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setVoiceError("Microphone permission denied.");
      } else if (err.name === "NotFoundError") {
        setVoiceError("No microphone found.");
      } else {
        setVoiceError(`Mic error: ${err.message}`);
      }
      setVoiceConnecting(false);
      return;
    }
    streamRef.current = stream;

    const ws = new WebSocket(getWsUrl());
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === "ready") {
          // Model finished loading on the server — now start accepting audio
          serverReadyRef.current = true;
          setListening(true);
          setVoiceConnecting(false);
          return;
        }
        if (msg.type === "error") {
          setVoiceError(msg.message);
          stopListening();
          return;
        }
        const base = baselineRef.current;
        const sep = base ? " " : "";
        if (msg.type === "final" && msg.text) {
          accumulatedRef.current += (accumulatedRef.current ? " " : "") + msg.text;
          setValue(base + sep + accumulatedRef.current);
        } else if (msg.type === "partial" && msg.text) {
          setValue(base + sep + accumulatedRef.current + (accumulatedRef.current ? " " : "") + msg.text);
        }
      } catch {
        // ignore
      }
    };

    ws.onerror = () => {
      if (!stoppingRef.current) {
        setVoiceError("Failed to connect to Vosk STT server.");
      }
      cleanupAudio();
      setListening(false);
      setVoiceConnecting(false);
    };

    ws.onclose = () => {
      if (!stoppingRef.current) {
        cleanupAudio();
        setListening(false);
        setVoiceConnecting(false);
      }
    };

    ws.onopen = () => {
      const audioCtx = new AudioContext({ sampleRate: VOSK_SAMPLE_RATE });
      contextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN || !serverReadyRef.current) return;
        const float32 = e.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          const s = Math.max(-1, Math.min(1, float32[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        ws.send(int16.buffer);
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
      // Stay in voiceConnecting (amber spinner) until server sends { type: "ready" }
    };
  }, [cleanupAudio]);

  const stopListening = useCallback(() => {
    stoppingRef.current = true;
    cleanupAudio();
    cleanupWs();
    setListening(false);
    setVoiceConnecting(false);
  }, [cleanupAudio, cleanupWs]);

  const toggleVoice = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      stoppingRef.current = true;
      cleanupAudio();
      cleanupWs();
    };
  }, [cleanupAudio, cleanupWs]);

  // ── Plan question selection state ────────────────────────────────────
  const [planSelections, setPlanSelections] = useState<Record<number, Set<string>>>({});
  const [otherTexts, setOtherTexts] = useState<Record<number, string>>({});
  const [planPage, setPlanPage] = useState(0);

  // Reset plan selections when questions change
  useEffect(() => {
    setPlanSelections({});
    setOtherTexts({});
    setPlanPage(0);
  }, [planQuestions.length]);

  const togglePlanOption = (qIdx: number, option: string) => {
    setPlanSelections((prev) => {
      const current = new Set(prev[qIdx] ?? []);
      const isOther = /other/i.test(option);
      if (current.has(option)) {
        current.delete(option);
        if (isOther) setOtherTexts((pt) => { const n = { ...pt }; delete n[qIdx]; return n; });
      } else {
        current.add(option);
      }
      return { ...prev, [qIdx]: current };
    });
  };

  const handlePlanSubmit = () => {
    const parts: string[] = [];
    planQuestions.forEach((q, i) => {
      const sel = planSelections[i];
      if (!sel || sel.size === 0) return;
      const answers = Array.from(sel).map((s) => {
        if (/other/i.test(s) && otherTexts[i]) return `Other: ${otherTexts[i]}`;
        return s;
      });
      parts.push(`**${q.question}**\n${answers.join(", ")}`);
    });
    if (parts.length > 0) {
      onSend?.(parts.join("\n\n"));
      setPlanSelections({});
      setOtherTexts({});
    }
  };

  const hasPlanQuestions = planQuestions.length > 0;
  const totalSelected = Object.values(planSelections).reduce((n, s) => n + s.size, 0);

  return (
    <div
      className="px-6 py-4 shrink-0"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsFocused(false)}
    >
      <div className="max-w-3xl mx-auto">
        {/* Attached documents pills */}
        {documents.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-white border border-[#E2E4E9] text-xs text-zinc-800 group"
              >
                <FileText className="w-3 h-3 text-zinc-400 shrink-0" />
                <span className="truncate max-w-30">{doc.name}</span>
                <span className="text-[10px] text-zinc-400">{formatSize(doc.size)}</span>
                <button
                  onClick={() => removeDocument(doc.id)}
                  className="w-4 h-4 flex items-center justify-center rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Plan mode questions — rendered above input */}
        {hasPlanQuestions && (
          <div className="mb-3 rounded-xl border border-[#E2E4E9] bg-white p-4 space-y-4">
            {/* Header with step counter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-primary">
                <ListChecks className="w-4 h-4" />
                <span>Plan Mode — Answer the questions below</span>
              </div>
              {planQuestions.length > 1 && (
                <span className="text-[10px] text-zinc-400 font-medium">
                  {planPage + 1} / {planQuestions.length}
                </span>
              )}
            </div>

            {/* Progress dots */}
            {planQuestions.length > 1 && (
              <div className="flex items-center gap-1.5">
                {planQuestions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPlanPage(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === planPage
                        ? "w-6 bg-primary"
                        : (planSelections[i]?.size ?? 0) > 0
                          ? "w-3 bg-primary/40"
                          : "w-3 bg-zinc-200"
                    )}
                  />
                ))}
              </div>
            )}

            {/* Current question */}
            {(() => {
              const q = planQuestions[planPage];
              if (!q) return null;
              const sel = planSelections[planPage] ?? new Set<string>();
              return (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-zinc-700">{q.question}</p>
                  <div className="grid gap-1.5">
                    {q.options.map((option) => {
                      const isSelected = sel.has(option);
                      const isOther = /other/i.test(option);
                      return (
                        <div key={option}>
                          <button
                            onClick={() => togglePlanOption(planPage, option)}
                            disabled={disabled}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-lg text-sm transition-all border",
                              isSelected
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-[#E2E4E9] bg-zinc-50 text-zinc-800 hover:border-primary/30 hover:bg-primary/5"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                                  isSelected ? "border-primary bg-primary" : "border-zinc-300"
                                )}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              {option}
                            </div>
                          </button>
                          {isOther && isSelected && (
                            <input
                              type="text"
                              placeholder="Please specify…"
                              value={otherTexts[planPage] ?? ""}
                              onChange={(e) => setOtherTexts((prev) => ({ ...prev, [planPage]: e.target.value }))}
                              className="mt-1.5 w-full px-3 py-2 rounded-lg border border-[#E2E4E9] text-sm text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                              autoFocus
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setPlanPage((p) => Math.max(0, p - 1))}
                disabled={planPage === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Back
              </button>

              <div className="flex items-center gap-2">
                {planPage < planQuestions.length - 1 ? (
                  <button
                    onClick={() => setPlanPage((p) => Math.min(planQuestions.length - 1, p + 1))}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={handlePlanSubmit}
                    disabled={totalSelected === 0 || disabled}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Submit Answers{totalSelected > 0 ? ` (${totalSelected})` : ""}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main input bar
             Note: pointer-events must NOT be blocked on the container when disabled
             because the stop button lives inside and must remain clickable. Individual
             controls each carry their own `disabled` attribute. */}
        <div
          className={cn(
            "bg-white rounded-2xl border border-[#E2E4E9] p-1.5 pl-3 flex items-end gap-2 transition-all shadow-sm",
            isFocused && "ring-2 ring-primary/50 border-primary/60"
          )}
        >
          {/* Attach document button */}
          <div className="flex items-center gap-0.5 pb-1.5 shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              title="Attach document"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-800 hover:text-zinc-800 hover:bg-zinc-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {/* Auto-expanding textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (listening) {
                // User manually edited the text while voice is on.
                // Move the baseline forward so the next Vosk result
                // appends here instead of overwriting what they typed.
                baselineRef.current = e.target.value;
                accumulatedRef.current = "";
              }
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Type your prompt..."
            disabled={disabled}
            rows={1}
            aria-label="Message input"
            className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-sm py-3 text-zinc-800 placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 resize-none leading-6 overflow-y-auto"
            style={{ maxHeight: 120 }}
          />

          {/* Right action buttons */}
          <div className="flex items-center gap-1 pr-1 pb-1.5 shrink-0">
            {/* Plan Mode toggle */}
            <button
              onClick={onTogglePlanMode}
              disabled={disabled}
              title={planMode ? "Plan mode: ON — AI will ask clarifying questions first" : "Plan mode: OFF"}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                planMode
                  ? "bg-primary/10 text-primary"
                  : "text-zinc-800 hover:text-zinc-800 hover:bg-zinc-100"
              )}
            >
              <ListChecks className="w-4 h-4" />
            </button>

            {/* Voice dictation */}
            <button
              onClick={toggleVoice}
              disabled={disabled || voiceConnecting}
              aria-label={voiceConnecting ? "Loading voice model…" : listening ? "Stop voice input" : "Start voice input"}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                voiceConnecting
                  ? "bg-amber-500/20 text-amber-400"
                  : listening
                    ? "bg-red-500 text-white animate-pulse"
                    : "text-zinc-800 hover:text-zinc-800 hover:bg-zinc-100"
              )}
            >
              {voiceConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : listening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            {/* Send / Stop —
                 When generating: a filled square (stop icon) using the primary accent colour.
                 When idle: the normal ArrowUp send button. */}
            {disabled ? (
              <button
                onClick={onStop}
                aria-label="Stop generation"
                className="w-9 h-9 bg-primary flex items-center justify-center rounded-xl hover:brightness-110 transition-all"
              >
                <Square className="w-3.5 h-3.5 fill-primary-foreground text-primary-foreground" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!value.trim()}
                aria-label="Send message"
                className="w-9 h-9 bg-primary flex items-center justify-center rounded-xl text-white hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Voice status — errors only; loading/listening state is communicated by the mic button itself */}
        {voiceError && (
          <p className="text-center text-xs text-red-500 mt-2">{voiceError}</p>
        )}
      </div>
    </div>
  );
}
