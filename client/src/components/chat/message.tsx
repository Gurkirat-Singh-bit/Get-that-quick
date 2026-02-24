import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Copy, Check, RefreshCw, Maximize2, Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type MessageRole = "assistant" | "user";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
}

interface MessageProps {
  message: ChatMessage;
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
      className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-700/80 text-slate-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
      title="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function MessageActions({ content }: { content: string }) {
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
        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        title="Copy response"
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>
      <button
        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        title="Regenerate response"
      >
        <RefreshCw className="w-3 h-3" />
        <span>Regenerate</span>
      </button>
      <button
        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        title="Expand response"
      >
        <Maximize2 className="w-3 h-3" />
        <span>Expand</span>
      </button>
      <button
        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        title="Refine response"
      >
        <Sparkles className="w-3 h-3" />
        <span>Refine</span>
      </button>
    </div>
  );
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === "user";

  const markdownComponents = useMemo(
    () => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pre: ({ children, ...props }: any) => (
        <div className="relative group my-3">
          <pre
            className="bg-[#1E1E1E] text-slate-200 rounded-lg p-4 overflow-x-auto text-[13px] leading-relaxed border border-slate-200/10"
            {...props}
          >
            {children}
          </pre>
          <CopyButton
            text={
              typeof children?.props?.children === "string"
                ? children.props.children
                : ""
            }
          />
        </div>
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      code: ({ className, children, ...props }: any) => {
        const isInline = !className;
        if (isInline) {
          return (
            <code
              className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[13px] font-mono"
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      table: ({ children, ...props }: any) => (
        <div className="my-3 overflow-x-auto">
          <table
            className="w-full text-sm border-collapse border border-slate-200"
            {...props}
          >
            {children}
          </table>
        </div>
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      th: ({ children, ...props }: any) => (
        <th
          className="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-700"
          {...props}
        >
          {children}
        </th>
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      td: ({ children, ...props }: any) => (
        <td
          className="border border-slate-200 px-3 py-2 text-sm text-slate-600"
          {...props}
        >
          {children}
        </td>
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      a: ({ children, ...props }: any) => (
        <a
          className="text-primary hover:underline"
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      blockquote: ({ children, ...props }: any) => (
        <blockquote
          className="border-l-3 border-slate-300 pl-4 my-3 text-slate-500 italic"
          {...props}
        >
          {children}
        </blockquote>
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ul: ({ children, ...props }: any) => (
        <ul className="list-disc pl-6 my-2 space-y-1" {...props}>
          {children}
        </ul>
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ol: ({ children, ...props }: any) => (
        <ol className="list-decimal pl-6 my-2 space-y-1" {...props}>
          {children}
        </ol>
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      h1: ({ children, ...props }: any) => (
        <h1 className="text-xl font-bold mt-5 mb-2 text-slate-900" {...props}>{children}</h1>
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      h2: ({ children, ...props }: any) => (
        <h2 className="text-lg font-bold mt-4 mb-2 text-slate-900" {...props}>{children}</h2>
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      h3: ({ children, ...props }: any) => (
        <h3 className="text-base font-semibold mt-3 mb-1.5 text-slate-800" {...props}>{children}</h3>
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      p: ({ children, ...props }: any) => (
        <p className="my-2 leading-relaxed" {...props}>{children}</p>
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hr: (props: any) => (
        <hr className="my-4 border-slate-200" {...props} />
      ),
    }),
    []
  );

  if (isUser) {
    return (
      <div className="py-4">
        <p className="text-[15px] text-slate-800 leading-relaxed">
          {message.content}
        </p>
      </div>
    );
  }

  return (
    <div className="py-4 text-[15px] text-slate-700 leading-relaxed group">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={markdownComponents}
      >
        {message.content}
      </ReactMarkdown>
      <MessageActions content={message.content} />
    </div>
  );
}
