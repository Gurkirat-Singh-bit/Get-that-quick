import { useState } from "react";
import { Mic, SendHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend?: (message: string) => void;
}

export function ChatInput({ onSend }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSend = () => {
    if (!value.trim()) return;
    onSend?.(value.trim());
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-6 py-4 shrink-0">
      <div
        className={cn(
          "max-w-3xl mx-auto bg-slate-50 rounded-2xl border border-slate-200 p-1.5 pl-5 flex items-center gap-3 transition-all",
          isFocused && "ring-2 ring-primary/20 border-primary/30"
        )}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder="Type your prompt..."
          className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-sm py-3 placeholder:text-slate-400"
        />
        <div className="flex items-center gap-1.5 pr-1">
          <button className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-primary transition-colors">
            <Mic className="w-4 h-4" />
          </button>
          <button
            onClick={handleSend}
            className="w-9 h-9 bg-primary flex items-center justify-center rounded-xl text-white hover:brightness-110 transition-all"
          >
            <SendHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
