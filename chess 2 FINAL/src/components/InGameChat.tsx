import React, { useState, useEffect, useRef } from "react";
import { ChatMessage, PLAYER_COLORS } from "../types";

export interface InGameChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  mySeat: number;
  playerName: string;
  isOnline: boolean;
  activePlayers?: Array<{ name: string; color: string; alive: boolean }>;
}

const QUICK_DISPATCHES = [
  "Peace treaty?",
  "Hold your borders!",
  "Dragon spotted!",
  "Nice move, sovereign.",
  "Yield your gold!",
  "GG, well fought.",
];

export default function InGameChat({
  messages,
  onSendMessage,
  mySeat,
  playerName,
  isOnline,
  activePlayers = [],
}: InGameChatProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const lastCountRef = useRef(messages.length);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll on new messages & track unread when minimized
  useEffect(() => {
    if (messages.length > lastCountRef.current) {
      if (!open) {
        setUnreadCount((c) => c + (messages.length - lastCountRef.current));
      } else {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }
      lastCountRef.current = messages.length;
    }
  }, [messages.length, open]);

  useEffect(() => {
    if (open) {
      setUnreadCount(0);
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [open]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    onSendMessage(clean);
    setText("");
  };

  const handleQuickSend = (phrase: string) => {
    onSendMessage(phrase);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <div className="pointer-events-auto fixed bottom-3 left-3 z-40 flex flex-col items-start font-sans">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="doodle flex items-center gap-2.5 px-3.5 py-2 text-sm font-black transition-transform hover:scale-105 active:scale-95 shadow-md"
          style={{ ["--panel" as string]: "#fff9e6" }}
          title="Open Courier Dispatch Chat"
        >
          {/* Hand-drawn quill / scroll icon */}
          <svg className="h-4 w-4 stroke-[#2b2118] stroke-2 fill-none" viewBox="0 0 24 24">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14z" />
            <path d="M7 7h10M7 12h10M7 17h6" />
          </svg>
          <span>COURIER CHAT</span>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white font-black animate-bounce">
              {unreadCount}
            </span>
          ) : (
            <span className="text-[11px] opacity-60 font-bold">({messages.length})</span>
          )}
        </button>
      ) : (
        <div
          className="doodle w-[340px] sm:w-[380px] flex flex-col p-0 overflow-hidden shadow-2xl tilt-a"
          style={{ ["--panel" as string]: "#fbf4dd" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-[3px] border-[#2b2118] bg-[#f1e4c3] px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full border-2 border-[#2b2118] bg-amber-500" />
              <span className="text-xs font-black tracking-wider uppercase text-[#2b2118]">
                COURIER DISPATCH · {isOnline ? "LIVE TABLE" : "WAR COUNCIL"}
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="px-2 py-0.5 text-xs font-black hover:bg-[#2b2118]/10 rounded"
              title="Close dispatch scroll"
            >
              MINIMIZE
            </button>
          </div>

          {/* Quick Dispatches */}
          <div className="flex flex-wrap gap-1 border-b border-dashed border-[#2b2118]/30 bg-[#f9f1d8] px-2.5 py-1.5">
            {QUICK_DISPATCHES.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => handleQuickSend(phrase)}
                className="rounded border border-[#2b2118]/40 bg-white/70 px-2 py-0.5 text-[11px] font-bold text-[#2b2118] hover:bg-white hover:border-[#2b2118] active:scale-95 transition-all"
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Messages Feed */}
          <div
            ref={scrollRef}
            className="h-64 overflow-y-auto p-3 space-y-2.5 text-[13px] bg-[#fdf8ea]/80"
          >
            {messages.length === 0 ? (
              <div className="py-8 text-center text-xs opacity-60 font-semibold italic">
                No courier dispatches sent yet. Propose a truce or banter with your rivals!
              </div>
            ) : null}

            {messages.map((m) => {
              const isMine = m.seat === mySeat && mySeat >= 0;
              const playerColor =
                m.seat >= 0 && m.seat < PLAYER_COLORS.length
                  ? PLAYER_COLORS[m.seat]
                  : "#78716c";

              if (m.isSystem) {
                return (
                  <div
                    key={m.id}
                    className="rounded border border-dashed border-[#2b2118]/40 bg-amber-100/60 px-2.5 py-1 text-center text-[11px] font-bold text-[#2b2118]/80"
                  >
                    <span>[ROYAL DECREE] {m.text}</span>
                  </div>
                );
              }

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5 text-[10px] font-black opacity-75">
                    <span
                      className="inline-block h-2 w-2 rounded-full border border-[#2b2118]"
                      style={{ backgroundColor: playerColor }}
                    />
                    <span>{isMine ? "You" : m.sender}</span>
                    <span className="opacity-50 font-normal">· {formatTime(m.timestamp)}</span>
                  </div>
                  <div
                    className={`max-w-[85%] rounded-lg border-2 border-[#2b2118] px-3 py-1.5 font-bold leading-snug break-words ${
                      isMine
                        ? "bg-[#e8f5e9] text-[#1b381e] shadow-sm"
                        : "bg-white text-[#2b2118] shadow-sm"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input Box */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-1.5 border-t-[3px] border-[#2b2118] bg-[#f1e4c3] p-2"
          >
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Draft diplomatic dispatch..."
              maxLength={200}
              className="flex-1 rounded border-2 border-[#2b2118] bg-white px-2.5 py-1 text-xs font-bold text-[#2b2118] outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="submit"
              className="btn px-3 py-1 text-xs font-black"
              style={{ ["--panel" as string]: "#8ee59a" }}
            >
              <span>SEND</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
