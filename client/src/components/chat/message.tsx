/**
 * @fileoverview Chat message bubble with markdown rendering.
 *
 * Renders user and assistant messages with full markdown support
 * (GFM tables, code blocks, etc.). Includes action buttons for
 * copy, regenerate, expand, and refine on assistant messages.
 *
 * @module components/chat/message
 */

import { useMemo, useState, isValidElement, type ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Copy, Check, RotateCw, Maximize2, Wand2, BookmarkPlus, Brain, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type MessageRole = "assistant" | "user";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
}

/** A parsed plan question with selectable options. */
export interface PlanQuestion {
  question: string;
  options: string[];
}

interface MessageProps {
  message: ChatMessage;
  /** Called when the user wants to convert this response to a template. */
  onSaveAsTemplate?: (content: string) => void;
  /** Called to regenerate the last assistant response. */
  onRegenerate?: () => void;
  /** Called to expand the last assistant response. */
  onExpand?: () => void;
  /** Called to refine the last assistant response. */
  onRefine?: () => void;
  /** Whether this is the last assistant message (only show actions on last). */
  isLastAssistant?: boolean;
  /** Edit this message's content. */
  onEdit?: (messageId: string, newContent: string) => void;
  /** Delete this message. */
  onDelete?: (messageId: string) => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-zinc-700/80 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
      title="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

interface MessageActionsProps {
  content: string;
  onSaveAsTemplate?: (content: string) => void;
  onRegenerate?: () => void;
  onExpand?: () => void;
  onRefine?: () => void;
  onDelete?: () => void;
}

function MessageActions({ content, onSaveAsTemplate, onRegenerate, onExpand, onRefine, onDelete }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
        title="Copy response"
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>
      {onRegenerate && (
        <button
          onClick={onRegenerate}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          title="Regenerate response"
        >
          <RotateCw className="w-3 h-3" />
          <span>Regenerate</span>
        </button>
      )}
      {onExpand && (
        <button
          onClick={onExpand}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          title="Expand response"
        >
          <Maximize2 className="w-3 h-3" />
          <span>Expand</span>
        </button>
      )}
      {onRefine && (
        <button
          onClick={onRefine}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          title="Refine response"
        >
          <Wand2 className="w-3 h-3" />
          <span>Refine</span>
        </button>
      )}
      {onSaveAsTemplate && (
        <button
          onClick={() => onSaveAsTemplate(content)}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-zinc-400 hover:text-primary hover:bg-primary/5 transition-colors"
          title="Save as template"
        >
          <BookmarkPlus className="w-3 h-3" />
          <span>Template</span>
        </button>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Delete response"
        >
          <Trash2 className="w-3 h-3" />
          <span>Delete</span>
        </button>
      )}
    </div>
  );
}

/** Parse <think>...</think> tags from content. Returns { thinking, visible }. */
function parseThinking(content: string): { thinking: string | null; visible: string } {
  const thinkMatch = content.match(/^<think>([\s\S]*?)<\/think>\s*/i);
  if (thinkMatch) {
    return {
      thinking: thinkMatch[1].trim(),
      visible: content.slice(thinkMatch[0].length),
    };
  }
  // Handle incomplete/streaming thinking block
  if (content.startsWith("<think>") && !content.includes("</think>")) {
    return {
      thinking: content.slice(7),
      visible: "",
    };
  }
  return { thinking: null, visible: content };
}

/** Collapsible thinking block for reasoning models. */
function ThinkingBlock({ content }: { content: string }) {
  const [open, setOpen] = useState(true);

  if (!content) return null;

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        <Brain className="w-3.5 h-3.5" />
        <span>Thinking</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-2 pl-3 border-l-2 border-zinc-200 text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );
}

/**
 * Parse <<PLAN_QUESTION>>...<<END_QUESTION>> blocks from assistant content.
 * Returns { segments } where each segment is either text or a PlanQuestion.
 */
export function parsePlanQuestions(content: string): Array<{ type: "text"; text: string } | { type: "question"; data: PlanQuestion }> {
  const segments: Array<{ type: "text"; text: string } | { type: "question"; data: PlanQuestion }> = [];
  const regex = /<<PLAN_QUESTION>>\s*([\s\S]*?)<<END_QUESTION>>/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Text before this question block
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) segments.push({ type: "text", text });
    }

    // Parse the question block
    const block = match[1].trim();
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);

    // First line (or lines before first "- ") is the question text
    const optionStartIdx = lines.findIndex((l) => l.startsWith("- "));
    if (optionStartIdx >= 0) {
      const question = lines.slice(0, optionStartIdx).join(" ").trim();
      const options = lines.slice(optionStartIdx).map((l) => l.replace(/^-\s*/, "").trim()).filter(Boolean);
      if (question && options.length >= 2) {
        segments.push({ type: "question", data: { question, options } });
      }
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last question
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) segments.push({ type: "text", text });
  }

  return segments;
}

export function Message({ message, onSaveAsTemplate, onRegenerate, onExpand, onRefine, isLastAssistant, onEdit, onDelete }: MessageProps) {
  const isUser = message.role === "user";
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const { thinking, visible } = useMemo(
    () => (isUser ? { thinking: null, visible: message.content } : parseThinking(message.content)),
    [isUser, message.content]
  );

  const markdownComponents = useMemo(
    () => ({
      pre: ({ children, ...props }: ComponentPropsWithoutRef<'pre'>) => {
        // Extract text content from code block for copy button
        // React markdown wraps code in a <code> element, so we check for that
        let codeText = "";
        try {
          if (
            isValidElement(children) &&
            children.props &&
            typeof (children.props as any).children === "string"
          ) {
            codeText = (children.props as any).children;
          }
        } catch {
          // Ignore extraction errors
        }
        
        return (
          <div className="relative group my-3">
            <pre
              className="bg-[#1E1E2E] text-zinc-200 rounded-lg p-4 overflow-x-auto text-[13px] leading-relaxed border border-[#2A2A3C]"
              {...props}
            >
              {children}
            </pre>
            <CopyButton text={codeText} />
          </div>
        );
      },
      code: ({ className, children, ...props }: ComponentPropsWithoutRef<'code'>) => {
        const isInline = !className;
        if (isInline) {
          return (
            <code
              className="bg-zinc-200/60 text-zinc-700 px-1.5 py-0.5 rounded text-[13px] font-mono"
              {...props}
            >
              {children}
            </code>
          );
        }
        return (
          <code className={cn("font-mono text-[13px]", className)} {...props}>
            {children}
          </code>
        );
      },
      table: ({ children, ...props }: ComponentPropsWithoutRef<'table'>) => (
        <div className="my-3 overflow-x-auto">
          <table
            className="w-full text-sm border-collapse border border-[#E2E4E9]"
            {...props}
          >
            {children}
          </table>
        </div>
      ),
      th: ({ children, ...props }: ComponentPropsWithoutRef<'th'>) => (
        <th
          className="border border-[#E2E4E9] bg-zinc-100 px-3 py-2 text-left text-xs font-semibold text-zinc-700"
          {...props}
        >
          {children}
        </th>
      ),
      td: ({ children, ...props }: ComponentPropsWithoutRef<'td'>) => (
        <td
          className="border border-[#E2E4E9] px-3 py-2 text-sm text-zinc-600"
          {...props}
        >
          {children}
        </td>
      ),
      a: ({ children, ...props }: ComponentPropsWithoutRef<'a'>) => (
        <a
          className="text-primary hover:underline"
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      ),
      blockquote: ({ children, ...props }: ComponentPropsWithoutRef<'blockquote'>) => (
        <blockquote
          className="border-l-3 border-zinc-300 pl-4 my-3 text-zinc-500 italic"
          {...props}
        >
          {children}
        </blockquote>
      ),
      ul: ({ children, ...props }: ComponentPropsWithoutRef<'ul'>) => (
        <ul className="list-disc pl-6 my-2 space-y-1" {...props}>
          {children}
        </ul>
      ),
      ol: ({ children, ...props }: ComponentPropsWithoutRef<'ol'>) => (
        <ol className="list-decimal pl-6 my-2 space-y-1" {...props}>
          {children}
        </ol>
      ),
      h1: ({ children, ...props }: ComponentPropsWithoutRef<'h1'>) => (
        <h1 className="text-xl font-bold mt-5 mb-2 text-zinc-800" {...props}>{children}</h1>
      ),
      h2: ({ children, ...props }: ComponentPropsWithoutRef<'h2'>) => (
        <h2 className="text-lg font-bold mt-4 mb-2 text-zinc-800" {...props}>{children}</h2>
      ),
      h3: ({ children, ...props }: ComponentPropsWithoutRef<'h3'>) => (
        <h3 className="text-base font-semibold mt-3 mb-1.5 text-zinc-700" {...props}>{children}</h3>
      ),
      p: ({ children, ...props }: ComponentPropsWithoutRef<'p'>) => (
        <p className="my-2 leading-relaxed" {...props}>{children}</p>
      ),
      hr: (props: ComponentPropsWithoutRef<'hr'>) => (
        <hr className="my-4 border-[#E2E4E9]" {...props} />
      ),
    }),
    []
  );

  if (isUser) {
    return (
      <div className="py-4 group">
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-white border border-[#E2E4E9] rounded-lg px-3 py-2 text-[15px] text-zinc-800 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
              rows={Math.min(editContent.split("\n").length + 1, 8)}
              autoFocus
            />
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  if (editContent.trim() && onEdit) {
                    onEdit(message.id, editContent.trim());
                  }
                  setEditing(false);
                }}
                disabled={!editContent.trim()}
                className="px-3 py-1 text-xs bg-primary text-white rounded-lg hover:brightness-110 disabled:opacity-50"
              >
                Save & Resend
              </button>
              <button
                onClick={() => { setEditing(false); setEditContent(message.content); }}
                className="px-3 py-1 text-xs text-zinc-500 hover:text-zinc-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <p className="flex-1 text-[15px] text-zinc-800 leading-relaxed">
              {message.content}
            </p>
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
              {onEdit && (
                <button
                  onClick={() => { setEditContent(message.content); setEditing(true); }}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                  title="Edit message"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(message.id)}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Delete message"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="py-4 text-[15px] text-zinc-700 leading-relaxed group">
      {thinking && <ThinkingBlock content={thinking} />}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={markdownComponents}
      >
        {visible}
      </ReactMarkdown>
      <MessageActions
        content={visible}
        onSaveAsTemplate={onSaveAsTemplate}
        onRegenerate={isLastAssistant ? onRegenerate : undefined}
        onExpand={isLastAssistant ? onExpand : undefined}
        onRefine={isLastAssistant ? onRefine : undefined}
        onDelete={onDelete ? () => onDelete(message.id) : undefined}
      />
    </div>
  );
}
