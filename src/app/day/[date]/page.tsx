"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Session {
  id: string;
  source: string;
  project: string;
  title: string;
  message_count: number;
  first_message_at: string;
  last_message_at: string;
  metadata: string;
}

interface Message {
  id: number;
  session_id: string;
  role: string;
  content: string;
  timestamp: string;
  metadata: string;
}

export default function DayPage() {
  const params = useParams();
  const date = params.date as string;
  const [data, setData] = useState<{ sessions: Session[]; messages: Message[] } | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/day/${date}`)
      .then((r) => r.json())
      .then(setData);
  }, [date]);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-zinc-500">Loading...</p>
      </div>
    );
  }

  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const messagesBySession: Record<string, Message[]> = {};
  for (const msg of data.messages) {
    if (!messagesBySession[msg.session_id]) messagesBySession[msg.session_id] = [];
    messagesBySession[msg.session_id].push(msg);
  }

  return (
    <div className="min-h-0">
      <div className="border-b border-[#1f1f23] bg-[#0c0c10]/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-8 py-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">
            {data.sessions.length} session{data.sessions.length !== 1 ? "s" : ""}
          </p>
          <h1 className="text-lg font-semibold text-white mt-0.5">{formattedDate}</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-8 space-y-4">
        {data.sessions.map((session) => {
          const msgs = messagesBySession[session.id] ?? [];
          const modelInfo = (() => {
            try {
              return JSON.parse(session.metadata || "{}");
            } catch {
              return {};
            }
          })();

          const isExpanded = expandedSession === session.id;

          return (
            <div
              key={session.id}
              className="bg-[#131315] border border-[#1f1f23] rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                className="w-full text-left p-4 hover:bg-[#16161a] transition-colors duration-150"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {session.project && (
                        <span className="text-[10px] uppercase tracking-wider text-indigo-400 border border-indigo-500/30 rounded px-1.5 py-0.5">
                          {session.project}
                        </span>
                      )}
                      {modelInfo.model && (
                        <span className="text-[10px] text-zinc-600">{modelInfo.model}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {session.title !== "global" ? session.title : "Untitled session"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-zinc-500">
                      {new Date(session.first_message_at).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">
                      {session.message_count} msg{session.message_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-[#1f1f23] divide-y divide-[#1f1f23]">
                  {msgs.map((msg) => (
                    <div key={msg.id} className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 ${
                            msg.role === "user"
                              ? "bg-zinc-800 text-zinc-300"
                              : "bg-violet-500/10 text-violet-400"
                          }`}
                        >
                          {msg.role}
                        </span>
                        <span className="text-[11px] text-zinc-600">
                          {new Date(msg.timestamp).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
