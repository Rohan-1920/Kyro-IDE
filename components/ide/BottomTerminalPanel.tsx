"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { TerminalTab } from "@/lib/types";

const initHistory = [
  { type: "cmd",   text: "npm run dev" },
  { type: "info",  text: "  Next.js 15.0.0" },
  { type: "link",  text: "  - Local:   http://localhost:3000" },
  { type: "ok",    text: "  Ready in 1.3s" },
  { type: "blank" },
  { type: "cmd",   text: "tsc --noEmit" },
  { type: "error", text: "src/App.tsx(7,15): error TS2304: Cannot find name 'x'" },
  { type: "blank" },
  { type: "ai",    text: "Coder AI: Variable 'x' define nahi hai — click Fix Bug to auto-fix" },
];

const problems = [
  { file: "App.tsx",  line: 7,  col: 15, sev: "error",   msg: "Cannot find name 'x'" },
  { file: "utils.ts", line: 12, col: 3,  sev: "warning", msg: "'result' is declared but never used" },
];

const outputLines = [
  { text: "Build started...",                      cls: "text-[#858585]" },
  { text: "Compiling TypeScript...",               cls: "text-[#858585]" },
  { text: "  OK src/App.tsx",                      cls: "text-[#4ec9b0]" },
  { text: "  OK src/components/ChatPanel.tsx",     cls: "text-[#4ec9b0]" },
  { text: "  WARN src/utils.ts - 1 warning",       cls: "text-[#e2c08d]" },
  { text: "Build complete in 2.1s",                cls: "text-[#4ec9b0]" },
];

const debugLines = [
  { text: "Debugger attached to process 12345",          cls: "text-[#4ec9b0]" },
  { text: "Breakpoint hit: App.tsx:6",                   cls: "text-[#e2c08d]" },
  { text: "  hasError = true",                           cls: "text-[#858585]" },
  { text: "  Stepping over...",                          cls: "text-[#858585]" },
  { text: "Exception thrown: Error: Undefined variable x", cls: "text-[#f44747]" },
];

const TABS: { id: TerminalTab; label: string }[] = [
  { id: "terminal", label: "Terminal"      },
  { id: "problems", label: "Problems"      },
  { id: "output",   label: "Output"        },
  { id: "debug",    label: "Debug Console" },
];

export function BottomTerminalPanel() {
  const [activeTab, setActiveTab]   = useState<TerminalTab>("terminal");
  const [input, setInput]           = useState("");
  const [history, setHistory]       = useState(initHistory);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx]       = useState(-1);
  const [maximized, setMaximized]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, activeTab]);

  const runCmd = () => {
    const cmd = input.trim();
    if (!cmd) return;
    setCmdHistory((p) => [cmd, ...p]);
    setHistIdx(-1);
    setHistory((p) => [
      ...p,
      { type: "cmd",   text: cmd },
      { type: "info",  text: `Running: ${cmd}...` },
      { type: "ok",    text: "Done." },
      { type: "blank" },
    ]);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { runCmd(); return; }
    if (e.key === "ArrowUp") {
      const idx = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(idx);
      setInput(cmdHistory[idx] ?? "");
      e.preventDefault();
    }
    if (e.key === "ArrowDown") {
      const idx = Math.max(histIdx - 1, -1);
      setHistIdx(idx);
      setInput(idx === -1 ? "" : cmdHistory[idx]);
      e.preventDefault();
    }
  };

  return (
    <motion.div
      animate={{ height: maximized ? "70vh" : "100%" }}
      transition={{ duration: 0.2 }}
      className="flex h-full flex-col overflow-hidden bg-[var(--ide-bg)]"
    >
      {/* Tab bar */}
      <div className="flex flex-shrink-0 items-center border-b border-[var(--ide-border)] bg-[var(--ide-panel)]">
        <div className="flex flex-1 items-end overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`relative flex items-center gap-1.5 px-3.5 py-2 text-[11px] transition-colors ${
                activeTab === t.id
                  ? "border-t border-[var(--ide-accent)] bg-[var(--ide-bg)] text-[var(--ide-text)]"
                  : "text-[var(--ide-muted)] hover:bg-[var(--ide-panel-2)] hover:text-[var(--ide-text)]"
              }`}
            >
              {t.id === "problems" && problems.length > 0 && (
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#f44747] text-[8px] font-bold text-white">
                  {problems.length}
                </span>
              )}
              {t.label}
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-0.5 px-2">
          <button
            onClick={() => setHistory(initHistory)}
            title="Clear"
            className="grid h-6 w-6 place-items-center rounded text-[var(--ide-muted)] transition hover:bg-[var(--ide-panel-2)] hover:text-[var(--ide-text)]"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13"/>
            </svg>
          </button>
          <button
            onClick={() => setMaximized((p) => !p)}
            title={maximized ? "Restore" : "Maximize"}
            className="grid h-6 w-6 place-items-center rounded text-[var(--ide-muted)] transition hover:bg-[var(--ide-panel-2)] hover:text-[var(--ide-text)]"
          >
            {maximized ? (
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M5 11H2V8M11 5h3v3M2 11l5-5M14 5l-5 5"/>
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 5V2h3M11 2h3v3M14 11v3h-3M5 14H2v-3"/>
              </svg>
            )}
          </button>
          <button
            title="New Terminal"
            className="grid h-6 w-6 place-items-center rounded text-[var(--ide-muted)] transition hover:bg-[var(--ide-panel-2)] hover:text-[var(--ide-text)]"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M8 3v10M3 8h10"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>

          {/* TERMINAL */}
          {activeTab === "terminal" && (
            <motion.div
              key="terminal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="flex flex-1 flex-col overflow-hidden bg-[var(--ide-bg)]"
              onClick={() => inputRef.current?.focus()}
            >
              <div className="thin-scroll flex min-h-0 flex-1 flex-col overflow-auto p-3 font-mono text-[12px] leading-[1.65]">
                {history.map((line, i) => {
                  if (line.type === "blank") return <div key={i} className="h-2" />;
                  if (line.type === "link") {
                    return (
                      <div key={i} className="text-[#858585]">
                        {"  - Local:   "}
                        <span className="cursor-pointer text-[#74a9ff] underline">
                          http://localhost:3000
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div key={i} className="flex items-start">
                      {line.type === "cmd" && (
                        <span className="mr-1 select-none text-[#74a9ff]">
                          PS C:\coder&gt;&nbsp;
                        </span>
                      )}
                      <span className={
                        line.type === "ok"    ? "text-[#6fd4be]" :
                        line.type === "error" ? "text-[#f44747]" :
                        line.type === "ai"    ? "text-[#8f90a2] italic" :
                        line.type === "cmd"   ? "text-white" :
                        "text-[#8f90a2]"
                      }>
                        {line.text}
                      </span>
                    </div>
                  );
                })}

                {/* Live input */}
                <div className="flex items-center">
                  <span className="select-none text-[#74a9ff]">PS C:\coder&gt;&nbsp;</span>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent text-white outline-none caret-white"
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>
                <div ref={bottomRef} />
              </div>
            </motion.div>
          )}

          {/* PROBLEMS */}
          {activeTab === "problems" && (
            <motion.div
              key="problems"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="flex-1 overflow-auto bg-[#1e1e1e] p-2 font-mono text-[12px]"
            >
              {problems.map((p, i) => (
                <div key={i} className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 hover:bg-[#2a2d2e]">
                  <span className={`mt-[3px] h-2 w-2 flex-shrink-0 rounded-full ${p.sev === "error" ? "bg-[#f44747]" : "bg-[#e2c08d]"}`} />
                  <div>
                    <span className="text-[#cccccc]">{p.file}</span>
                    <span className="text-[#858585]">:{p.line}:{p.col}</span>
                    <span className={`ml-2 ${p.sev === "error" ? "text-[#f44747]" : "text-[#e2c08d]"}`}>{p.sev}</span>
                    <span className="ml-2 text-[#858585]">{p.msg}</span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* OUTPUT */}
          {activeTab === "output" && (
            <motion.div
              key="output"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="flex-1 overflow-auto bg-[#1e1e1e] p-3 font-mono text-[12px] leading-[1.7]"
            >
              {outputLines.map((l, i) => (
                <div key={i} className={l.cls}>{l.text}</div>
              ))}
            </motion.div>
          )}

          {/* DEBUG */}
          {activeTab === "debug" && (
            <motion.div
              key="debug"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="flex flex-1 flex-col overflow-hidden bg-[#1e1e1e]"
            >
              <div className="flex-1 overflow-auto p-3 font-mono text-[12px] leading-[1.7]">
                {debugLines.map((l, i) => (
                  <div key={i} className={l.cls}>{l.text}</div>
                ))}
              </div>
              <div className="flex items-center border-t border-[#3c3c3c] px-3 py-2 font-mono text-[12px]">
                <span className="select-none text-[#569cd6]">&gt;&nbsp;</span>
                <input
                  className="flex-1 bg-transparent text-[#cccccc] outline-none caret-[#cccccc] placeholder:text-[#858585]"
                  spellCheck={false}
                  placeholder="Evaluate expression..."
                />
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}
