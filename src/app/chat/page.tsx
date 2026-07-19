"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: { date: string; source: string; project: string }[];
  loading?: boolean;
}

const DEFAULT_MODEL = "gemini-3.1-flash-lite-preview";

const MODELS = [
  { id: "gemini-3.1-flash-lite-preview", label: "Flash Lite", description: "Cheapest" },
  { id: "gemini-3-flash-preview", label: "Flash 3", description: "Fast" },
  { id: "gemini-3.1-pro-preview", label: "Pro 3.1", description: "Best" },
];

const EXAMPLES = [
  "How did we implement the job discovery flow?",
  "What did I work on June 8?",
  "What decisions did I make about the database?",
  "Show me everything about auth in tal-ai-agent",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [modelId, setModelId] = useState(DEFAULT_MODEL);
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (query: string) => {
    if (!query.trim() || pending) return;

    const userMsg: Message = { role: "user", content: query };
    const assistantMsg: Message = { role: "assistant", content: "", loading: true };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          modelId,
          thinkingEnabled,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let finalSources: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "token") {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant") {
                  last.content += data.text;
                  last.loading = false;
                }
                return next;
              });
            }

            if (data.type === "done") {
              finalSources = data.sources ?? [];
            }

            if (data.type === "error") {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant") {
                  last.content = `Error: ${data.message}`;
                  last.loading = false;
                }
                return next;
              });
            }
          } catch {}
        }
      }

      if (finalSources.length > 0) {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            last.sources = finalSources;
          }
          return next;
        });
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          last.content = "Failed to reach the API. Check your Gemini key in .env.";
          last.loading = false;
        }
        return next;
      });
    }

    setPending(false);
  };

  return (
    <div className="h-full flex flex-col bg-[#09090b] text-zinc-200">
      <div className="border-b border-[#1f1f23] bg-[#0c0c10]/50 backdrop-blur-sm shrink-0">
        <div className="max-w-3xl mx-auto px-8 py-3 flex items-center justify-between gap-3">
          <h1 className="text-base font-semibold text-white">Chat</h1>
          <div className="flex items-center gap-3">
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="bg-[#131315] border border-[#1f1f23] rounded-lg px-3 py-1.5 text-xs text-zinc-400 focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer hover:border-zinc-700 transition-colors"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} · {m.description}
                </option>
              ))}
            </select>

            {modelId.includes("pro") && (
              <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={thinkingEnabled}
                  onChange={(e) => setThinkingEnabled(e.target.checked)}
                  className="rounded border-zinc-700 bg-[#131315] text-violet-500 focus:ring-violet-500/30"
                />
                Thinking
              </label>
            )}

            <button
              onClick={() => setMessages([])}
              className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors px-2 py-1 rounded border border-zinc-800"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-16 space-y-4">
              <p className="text-sm text-zinc-500">Ask something about your work history</p>
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => send(ex)}
                    className="text-xs text-zinc-400 bg-[#131315] border border-[#1f1f23] rounded-lg px-3 py-1.5 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              <div className={`max-w-[85%] ${msg.role === "user" ? "order-1" : ""}`}>
                {msg.role === "user" ? (
                  <div className="bg-violet-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm">
                    {msg.content}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                      {msg.loading && <span className="inline-block w-2 h-4 bg-zinc-500 animate-pulse ml-0.5 align-middle" />}
                    </div>

                    {msg.sources && msg.sources.length > 0 && (
                      <div className="text-[11px] text-zinc-600 space-y-1 pt-1 border-t border-[#1f1f23]">
                        {msg.sources.map((s, si) => (
                          <span key={si} className="inline-flex items-center gap-1 mr-3">
                            {s.project && <span className="text-violet-400">{s.project}</span>}
                            <span>·</span>
                            <span className="capitalize">{s.source}</span>
                            <span>·</span>
                            <span>{s.date}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-[#1f1f23] bg-[#0c0c10]/50 shrink-0">
        <div className="max-w-3xl mx-auto px-8 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your work history..."
              disabled={pending}
              className="flex-1 bg-[#131315] border border-[#1f1f23] rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              className="bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
