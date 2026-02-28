/**
 * @fileoverview Chat input bar with send button and local Vosk voice dictation.
 *
 * Pinned to the bottom of the chat area. Supports keyboard
 * shortcut (Enter), auto-expanding textarea, and local Vosk STT
 * via WebSocket for fully offline voice input.
 *
 * @module components/chat/chat-input
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

/** Props accepted by {@link ChatInput}. */
interface ChatInputProps {
  /** Called with the trimmed message text when the user sends. */
  onSend?: (message: string) => void;
  /** When `true`, input and buttons are disabled (e.g. during generation). */
  disabled?: boolean;
}

/** Target sample rate that the Vosk server expects. */
const VOSK_SAMPLE_RATE = 16_000;

/**
 * Resolve the WebSocket URL for `/ws/stt`.
 * In dev Vite proxies it; in production same origin.
 */
function getWsUrl(): string {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/ws/stt`;
}

/**
 * Compact prompt input bar with send button and local Vosk voice input.
 */
export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Voice state ──────────────────────────────────────────────────────
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  /** Refs that persist across renders. */
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const valueRef = useRef(value);
  const baselineRef = useRef("");
  const accumulatedRef = useRef("");
  const stoppingRef = useRef(false);
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

  // ── Cleanup helper ──────────────────────────────────────────────────
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
    stoppingRef.current = false;
    baselineRef.current = valueRef.current;
    accumulatedRef.current = "";

    // 1. Get microphone access
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
      return;
    }
    streamRef.current = stream;

    // 2. Open WebSocket to local Vosk server
    const ws = new WebSocket(getWsUrl());
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
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
        // ignore malformed messages
      }
    };

    ws.onerror = () => {
      if (!stoppingRef.current) {
        setVoiceError("Failed to connect to Vosk STT server. Is the server running?");
      }
      cleanupAudio();
      setListening(false);
    };

    ws.onclose = () => {
      if (!stoppingRef.current) {
        // Unexpected close
        cleanupAudio();
        setListening(false);
      }
    };

    ws.onopen = () => {
      // 3. Set up audio pipeline: mic → AudioContext → ScriptProcessor → WS
      const audioCtx = new AudioContext({ sampleRate: VOSK_SAMPLE_RATE });
      contextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // ScriptProcessor: buffer 4096 frames, 1 input channel, 1 output channel
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;

        const float32 = e.inputBuffer.getChannelData(0);
        // Convert Float32 [-1,1] to Int16 PCM (what Vosk expects)
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          const s = Math.max(-1, Math.min(1, float32[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        ws.send(int16.buffer);
      };

      source.connect(processor);
      processor.connect(audioCtx.destination); // required for onaudioprocess to fire
      setListening(true);
    };
  }, [cleanupAudio]);

  // ── Stop listening ──────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    stoppingRef.current = true;
    cleanupAudio();
    cleanupWs();
    setListening(false);
  }, [cleanupAudio, cleanupWs]);

  const toggleVoice = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stoppingRef.current = true;
      cleanupAudio();
      cleanupWs();
    };
  }, [cleanupAudio, cleanupWs]);

  return (
    <div className="px-6 py-4 shrink-0">
      <div
        className={cn(
          "max-w-3xl mx-auto bg-white rounded-2xl border border-[#E2E4E9] p-1.5 pl-5 flex items-end gap-3 transition-all shadow-sm",
          isFocused && "ring-2 ring-primary/20 border-primary/30",
          disabled && "opacity-60 pointer-events-none"
        )}
      >
        {/* Auto-expanding textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Type your prompt..."
          disabled={disabled}
          rows={1}
          aria-label="Message input"
          className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-sm py-3 text-zinc-800 placeholder:text-zinc-400 disabled:cursor-not-allowed resize-none leading-6 overflow-y-auto"
          style={{ maxHeight: 120 }}
        />

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 pr-1 pb-1.5">
          {/* Voice dictation button — uses local Vosk STT */}
          <button
            onClick={toggleVoice}
            disabled={disabled}
            aria-label={listening ? "Stop voice input" : "Start voice input"}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-xl transition-all",
              listening
                ? "bg-red-500 text-white animate-pulse"
                : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700"
            )}
          >
            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            aria-label="Send message"
            className="w-9 h-9 bg-primary flex items-center justify-center rounded-xl text-white hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Voice status indicators */}
      {listening && (
        <p className="text-center text-xs text-primary mt-2 animate-pulse">Listening… (local Vosk STT)</p>
      )}
      {voiceError && (
        <p className="text-center text-xs text-red-500 mt-2">{voiceError}</p>
      )}
    </div>
  );
}
