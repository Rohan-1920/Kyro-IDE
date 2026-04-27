"use client";

import { quickActions } from "@/lib/ide-data";
import type { ChatMessage } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";

type AIChatPanelProps = {
  isOpen: boolean;
  messages: ChatMessage[];
  input: string;
  isTyping: boolean;
  onInputChange: (value: string) => void;
  onClose: () => void;
  onSend: () => void;
};

const quickPromptMap: Record<string, string> = {
  Explain:        "Is code ka simple explanation do, beginner level par.",
  "Fix Bug":      "Is error ko step-by-step fix karo aur correct code do.",
  Optimize:       "Is code ko optimize karo aur performance improve karo.",
  "Generate Docs":"Is function ke liye JSDoc documentation generate karo.",
};

function renderMessage(text: string) {
  const segments = text.split("```");
  return segments.map((seg, i) => {
    if (i % 2 === 1) {
      const newline = seg.indexOf("\n");
      const lang = newline > -1 ? seg.slice(0, newline).trim() : "";
      const code = newline > -1 ? seg.slice(newline + 1).trim() : seg.trim();
      return (
        <div key={i} className="my-2 overflow-hidden rounded border border-[#3c3c3c] bg-[#1e1e1e]">
          {lang && (
            <div className="border-b border-[#3c3c3c] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[#858585]">
              {lang}
            </div>
          )}
          <pre className="overflow-x-auto p-3 text-[11px] leading-relaxed text-[#cccccc]">
            <code>{code}</code>
          </pre>
        </div>
      );
    }
    const parts = seg.split(/\*\*(.*?)\*\*/g);
    return (
      <p key={i} className="whitespace-pre-wrap">
        {parts.map((part, pi) =>
          pi % 2 === 1 ? (
            <strong key={pi} className="font-semibold text-white">
              {part}
            </strong>
          ) : (
            part
          )
        )}
      </p>
    );
  });
}

export function AIChatPanel({
  isOpen,
  messages,
  input,
  isTyping,
  onInputChange,
  onClose,
  onSend,
}: AIChatPanelProps) {
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const panelContent = (
    <div className="flex h-full flex-col overflow-hidden border-l border-[var(--ide-border)] bg-[var(--ide-panel)]">

      {/* ── Header ── */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--ide-border)] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[14px] text-[#6366f1]">✦</span>
          <span className="text-[13px] font-semibold text-[var(--ide-text)]">Coder AI</span>
          <span className="rounded-full border border-[#4ec9b0]/40 bg-[#4ec9b0]/10 px-1.5 py-0.5 text-[9px] font-medium text-[#4ec9b0]">
            Online
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* New chat */}
          <button
            title="New chat"
            className="grid h-6 w-6 place-items-center rounded text-[#858585] hover:bg-[#2a2d2e] hover:text-[#cccccc]"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M8 3v10M3 8h10"/>
            </svg>
          </button>
          {/* Close */}
          <button
            onClick={onClose}
            title="Close"
            className="grid h-6 w-6 place-items-center rounded text-[#858585] hover:bg-[#2a2d2e] hover:text-[#cccccc]"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Quick action chips ── */}
      <div className="flex flex-shrink-0 flex-wrap gap-1.5 border-b border-[var(--ide-border)] px-3 py-2">
        {quickActions.map((action) => (
          <button
            key={action}
            onClick={() => {
              onInputChange(quickPromptMap[action] ?? action);
              inputRef.current?.focus();
            }}
            className="rounded-full border border-[var(--ide-border)] bg-[var(--ide-bg)] px-2.5 py-0.5 text-[11px] text-[var(--ide-muted)] transition-colors hover:border-[var(--ide-accent)]/50 hover:bg-[var(--ide-accent)]/10 hover:text-[var(--ide-text)]"
          >
            {action}
          </button>
        ))}
      </div>

      {/* ── Messages ── */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className={`flex flex-col gap-1 ${msg.type === "user" ? "items-end" : "items-start"}`}
          >
            {/* Label row */}
            <div className="flex items-center gap-1.5">
              {msg.type === "ai" && (
                <div className="grid h-4 w-4 place-items-center rounded bg-[#6366f1] text-[8px] text-white">
                  ✦
                </div>
              )}
              <span className="text-[10px] font-medium text-[#858585]">
                {msg.type === "user" ? "You" : "Coder AI"}
              </span>
              {msg.timestamp && (
                <span className="text-[9px] text-[#3c3c3c]">{msg.timestamp}</span>
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[92%] rounded px-3 py-2 text-[12px] leading-relaxed ${
                msg.type === "user"
                  ? "border border-[var(--ide-border)] bg-[var(--ide-panel-2)] text-[var(--ide-text)]"
                  : "border border-[#6366f1]/20 bg-[#6366f1]/[0.07] text-[var(--ide-text)]"
              }`}
            >
              {renderMessage(msg.text)}
            </div>
          </motion.div>
        ))}

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="flex items-center gap-2"
            >
              <div className="grid h-4 w-4 place-items-center rounded bg-[#6366f1] text-[8px] text-white">
                ✦
              </div>
              <div className="flex items-center gap-1 rounded border border-[#6366f1]/20 bg-[#6366f1]/[0.07] px-3 py-2">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6366f1]" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6366f1]" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6366f1]" style={{ animationDelay: "300ms" }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ── */}
      <div className="flex-shrink-0 border-t border-[var(--ide-border)] p-3">
        <div className="flex items-end gap-2 rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-3 py-2 focus-within:border-[var(--ide-accent)]/60">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Ask Coder AI anything…"
            rows={1}
            className="flex-1 resize-none bg-transparent text-[12px] text-[var(--ide-text)] placeholder:text-[var(--ide-muted)] outline-none leading-relaxed"
            style={{ maxHeight: 80 }}
          />
          <button
            onClick={onSend}
            disabled={!input.trim()}
            className="mb-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded bg-[var(--ide-accent)] text-white transition hover:bg-[#4668e8] disabled:opacity-40"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M2 8h12M9 3l5 5-5 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-[#858585]">
          Shift+Enter for new line
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Static panel on xl */}
      <div className="hidden h-full xl:flex xl:flex-col" style={{ width: 340 }}>
        {panelContent}
      </div>

      {/* Slide-in overlay on smaller screens */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="ai-overlay"
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="fixed right-0 top-0 z-40 flex h-full flex-col xl:hidden"
            style={{ width: "min(94vw, 340px)" }}
          >
            {panelContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
