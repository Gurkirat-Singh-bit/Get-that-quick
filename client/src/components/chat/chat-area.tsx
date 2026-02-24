import { useState, useRef, useEffect } from "react";
import { BookTemplate, PanelRightOpen, PanelRightClose } from "lucide-react";
import { Message, type ChatMessage } from "@/components/chat/message";
import { ChatInput } from "@/components/chat/chat-input";

interface ChatAreaProps {
  templatesOpen: boolean;
  onToggleTemplates: () => void;
}

const demoMessages: ChatMessage[] = [
  {
    id: "1",
    role: "user",
    content: "Can you help me write a utility function to deep merge objects in TypeScript?",
  },
  {
    id: "2",
    role: "assistant",
    content: `Sure! Here's a type-safe deep merge utility:

\`\`\`typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: DeepPartial<T>
): T {
  const output = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const targetVal = target[key];
      const sourceVal = source[key];

      if (
        targetVal &&
        sourceVal &&
        typeof targetVal === "object" &&
        typeof sourceVal === "object" &&
        !Array.isArray(targetVal)
      ) {
        (output as Record<string, unknown>)[key] = deepMerge(
          targetVal as Record<string, unknown>,
          sourceVal as Record<string, unknown>
        );
      } else {
        (output as Record<string, unknown>)[key] = sourceVal;
      }
    }
  }

  return output;
}
\`\`\`

### Key features

- **Type-safe** — uses \`DeepPartial<T>\` so the source only allows valid keys
- **Recursive** — handles nested objects of any depth
- **Immutable** — returns a new object, never mutates inputs
- **Array-aware** — arrays are replaced, not merged element-by-element

### Usage example

\`\`\`typescript
const defaults = {
  theme: { colors: { primary: "#FF5F38", bg: "#FFFFFF" } },
  features: { darkMode: false, animations: true },
};

const userConfig = {
  theme: { colors: { primary: "#3B82F6" } },
  features: { darkMode: true },
};

const merged = deepMerge(defaults, userConfig);
// => { theme: { colors: { primary: "#3B82F6", bg: "#FFFFFF" } },
//      features: { darkMode: true, animations: true } }
\`\`\`

> **Note:** If you need to merge arrays deeply or handle \`Map\`/\`Set\`, consider using a library like [deepmerge](https://github.com/TehShrike/deepmerge).`,
  },
  {
    id: "3",
    role: "user",
    content: "What are the time complexities of common data structures?",
  },
  {
    id: "4",
    role: "assistant",
    content: `Here's a quick reference:

| Data Structure | Access | Search | Insertion | Deletion |
|---|---|---|---|---|
| Array | O(1) | O(n) | O(n) | O(n) |
| Linked List | O(n) | O(n) | O(1) | O(1) |
| Hash Table | — | O(1) avg | O(1) avg | O(1) avg |
| Binary Search Tree | O(log n) | O(log n) | O(log n) | O(log n) |
| Heap | — | O(n) | O(log n) | O(log n) |

A few things to keep in mind:

1. **Hash Tables** have O(1) *average* case but O(n) worst case due to collisions
2. **BST complexities** assume the tree is balanced — an unbalanced BST degrades to O(n)
3. For **sorted data**, consider a balanced BST (AVL / Red-Black) or a skip list

Want me to go deeper into any of these?`,
  },
];

export function ChatArea({ templatesOpen, onToggleTemplates }: ChatAreaProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(demoMessages);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (content: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
    };
    setMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "This is a **UI demo** — backend integration is coming soon. Your prompt toolkit will connect to local LLMs via the server.",
      },
    ]);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 shrink-0">
        <h1 className="text-base font-bold tracking-tight text-slate-800 font-[var(--font-display)]">Auth Flow Refactor</h1>
        <button
          onClick={onToggleTemplates}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors"
        >
          <BookTemplate className="w-3.5 h-3.5" />
          <span>Templates</span>
          {templatesOpen ? (
            <PanelRightClose className="w-3.5 h-3.5 ml-0.5" />
          ) : (
            <PanelRightOpen className="w-3.5 h-3.5 ml-0.5" />
          )}
        </button>
      </div>

      {/* Messages — scrollable middle */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {messages.map((msg, i) => (
            <div key={msg.id}>
              <Message message={msg} />
              {i < messages.length - 1 && msg.role === "assistant" && (
                <div className="border-t border-slate-100 my-1" />
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input — always pinned at bottom */}
      <ChatInput onSend={handleSend} />
    </div>
  );
}
