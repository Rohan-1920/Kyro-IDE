"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { TerminalExecution } from "@/lib/server/types";
import type { TerminalTab } from "@/lib/types";

type BottomTerminalPanelProps = {
  projectId: string;
};

type TerminalLine = {
  id: string;
  type: "cmd" | "info" | "ok" | "error" | "blank";
  text: string;
  at?: string;
};

type ProblemItem = {
  id: string;
  file: string;
  line: number;
  col: number;
  sev: "error" | "warning";
  msg: string;
};

type CommandPreset = {
  id: string;
  label: string;
  command: string;
};

type TerminalSessionItem = {
  id: string;
  title: string;
  updatedAt: string;
};

const TABS: { id: TerminalTab; label: string }[] = [
  { id: "terminal", label: "Terminal" },
  { id: "problems", label: "Problems" },
  { id: "output", label: "Output" },
  { id: "debug", label: "Debug Console" }
];

const COMMAND_PRESETS: CommandPreset[] = [
  { id: "dev", label: "Dev", command: "npm run dev" },
  { id: "build", label: "Build", command: "npm run build" },
  { id: "lint", label: "Lint", command: "npm run lint" },
  { id: "typecheck", label: "Typecheck", command: "npx tsc --noEmit" }
];

function runToLines(run: TerminalExecution): TerminalLine[] {
  const first: TerminalLine = {
    id: `${run.id}:cmd`,
    type: "cmd",
    text: run.command,
    at: run.executedAt
  };
  const out = run.output
    .split("\n")
    .filter((x) => x.trim().length > 0)
    .map((line, idx): TerminalLine => {
      const lower = line.toLowerCase();
      const isError = lower.includes("error") || lower.includes("blocked");
      return {
        id: `${run.id}:line:${idx}`,
        type: isError ? "error" : run.status === "failed" ? "error" : "info",
        text: line,
        at: run.executedAt
      };
    });
  const tail: TerminalLine = {
    id: `${run.id}:status`,
    type: run.status === "completed" ? "ok" : "error",
    text: run.status === "completed" ? "Done." : "Failed.",
    at: run.executedAt
  };
  return [first, ...out, tail, { id: `${run.id}:blank`, type: "blank", text: "" }];
}

function parseProblems(lines: TerminalLine[]): ProblemItem[] {
  const items: ProblemItem[] = [];
  const tsPattern = /([^()\s]+)\((\d+),(\d+)\):\s*(error|warning)\s*[A-Z0-9]*:?\s*(.+)/i;
  for (const line of lines) {
    if (line.type !== "error" && line.type !== "info") continue;
    const m = tsPattern.exec(line.text);
    if (!m) continue;
    items.push({
      id: `${line.id}:problem`,
      file: m[1],
      line: Number(m[2]),
      col: Number(m[3]),
      sev: m[4].toLowerCase() === "warning" ? "warning" : "error",
      msg: m[5]
    });
  }
  return items;
}

export function BottomTerminalPanel({ projectId }: BottomTerminalPanelProps) {
  const [activeTab, setActiveTab] = useState<TerminalTab>("terminal");
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<TerminalLine[]>([]);
  const [runs, setRuns] = useState<TerminalExecution[]>([]);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [maximized, setMaximized] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<TerminalSessionItem[]>([]);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [connection, setConnection] = useState<"offline" | "connecting" | "live">("offline");
  const [evalInput, setEvalInput] = useState("");
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyStatus, setHistoryStatus] = useState<"all" | "completed" | "failed">("all");
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [lastRunMs, setLastRunMs] = useState<number | null>(null);
  const [lastRunStatus, setLastRunStatus] = useState<"idle" | "running" | "completed" | "failed">("idle");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const problems = useMemo(() => parseProblems(history), [history]);
  const outputLines = useMemo(() => history.filter((h) => h.type !== "cmd"), [history]);

  const lastExecutedRun = runs.length > 0 ? runs[runs.length - 1] : null;
  const retryCommand = lastExecutedRun?.command ?? "";
  const runCount = runs.length;
  const failedRuns = runs.filter((r) => r.status === "failed").length;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, activeTab]);

  useEffect(() => {
    if (!sessionId) return;
    const cacheKey = `coder.ide.term.cmdHistory:${projectId}:${sessionId}`;
    const raw = window.localStorage.getItem(cacheKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) setCmdHistory(parsed.slice(0, 40));
      } catch {
        window.localStorage.removeItem(cacheKey);
      }
    }
  }, [projectId, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    window.localStorage.setItem(`coder.ide.term.cmdHistory:${projectId}:${sessionId}`, JSON.stringify(cmdHistory.slice(0, 40)));
  }, [cmdHistory, projectId, sessionId]);

  const loadSessions = async () => {
    const res = await fetch(`/api/terminal/sessions?projectId=${projectId}`);
    const json = (await res.json()) as { data?: TerminalSessionItem[] };
    let list = json.data ?? [];
    if (!res.ok) return;
    if (list.length === 0) {
      const created = await fetch("/api/terminal/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId })
      });
      const createdJson = (await created.json()) as { data?: TerminalSessionItem };
      if (created.ok && createdJson.data) {
        list = [createdJson.data];
      }
    }
    setSessions(list);
    const saved = window.localStorage.getItem(`coder.ide.term.activeSession:${projectId}`);
    const selected = list.find((s) => s.id === saved) ?? list[0];
    setSessionId(selected?.id ?? null);
  };

  useEffect(() => {
    setHistory([]);
    setSessionId(null);
    setSessions([]);
    setHistoryCursor(null);
    setHistoryHasMore(false);
    setConnection("connecting");
    void loadSessions();
  }, [projectId]);

  useEffect(() => {
    if (!sessionId) return;
    window.localStorage.setItem(`coder.ide.term.activeSession:${projectId}`, sessionId);
    setConnection("connecting");
    setHistory([]);
    setRuns([]);
    setInput("");
    setCmdHistory([]);
    setHistIdx(-1);
    setHistoryCursor(null);
    setHistoryHasMore(false);
    setLastRunMs(null);
    setLastRunStatus("idle");
    setHistoryLoading(false);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    const es = new EventSource(`/api/terminal/sessions/${sessionId}/stream`);
    eventSourceRef.current = es;
    es.addEventListener("ready", () => setConnection("live"));
    es.addEventListener("terminal", (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as TerminalExecution;
      setRuns((prevRuns) => {
        if (prevRuns.some((r) => r.id === payload.id)) return prevRuns;
        const nextRuns = [...prevRuns, payload].sort((a, b) => a.sequence - b.sequence);
        return nextRuns;
      });
      setHistory((prevHistory) => {
        const cmdId = `${payload.id}:cmd`;
        if (prevHistory.some((l) => l.id === cmdId)) return prevHistory;
        return [...prevHistory, ...runToLines(payload)];
      });
    });
    es.onerror = () => setConnection("offline");
    return () => {
      es.close();
      if (eventSourceRef.current === es) eventSourceRef.current = null;
    };
  }, [projectId, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const loadHistory = async () => {
      setHistoryLoading(true);
      const query = new URLSearchParams({
        projectId,
        sessionId,
        limit: "80"
      });
      if (historyStatus !== "all") query.set("status", historyStatus);
      if (historyQuery.trim()) query.set("q", historyQuery.trim());
      const historyRes = await fetch(`/api/terminal/execute?${query.toString()}`);
      const historyJson = (await historyRes.json()) as {
        data?: { items: TerminalExecution[]; nextCursor: string | null };
      };
      if (historyRes.ok && historyJson.data) {
        const sortedRuns = historyJson.data.items.sort((a, b) => a.sequence - b.sequence);
        const lines = sortedRuns.flatMap(runToLines);
        setRuns(sortedRuns);
        setHistory(lines);
        setHistoryCursor(historyJson.data.nextCursor);
        setHistoryHasMore(Boolean(historyJson.data.nextCursor));
        const last = sortedRuns[sortedRuns.length - 1];
        setLastRunStatus(last ? (last.status === "failed" ? "failed" : "completed") : "idle");
        setLastRunMs(null);
      }
      setHistoryLoading(false);
    };
    void loadHistory();
  }, [projectId, sessionId, historyStatus, historyQuery]);

  const loadMoreHistory = async () => {
    if (!sessionId || !historyCursor || historyLoading) return;
    setHistoryLoading(true);
    const query = new URLSearchParams({
      projectId,
      sessionId,
      limit: "80",
      cursor: historyCursor
    });
    if (historyStatus !== "all") query.set("status", historyStatus);
    if (historyQuery.trim()) query.set("q", historyQuery.trim());
    const historyRes = await fetch(`/api/terminal/execute?${query.toString()}`);
    const historyJson = (await historyRes.json()) as {
      data?: { items: TerminalExecution[]; nextCursor: string | null };
    };
    if (historyRes.ok && historyJson.data) {
      const olderRuns = historyJson.data.items.sort((a, b) => a.sequence - b.sequence);
      const olderLines = olderRuns.flatMap(runToLines);
      setRuns((prevRuns) => {
        const merged = [...olderRuns, ...prevRuns].sort((a, b) => a.sequence - b.sequence);
        const last = merged[merged.length - 1];
        setLastRunStatus(last ? (last.status === "failed" ? "failed" : "completed") : "idle");
        return merged;
      });
      setHistory((prev) => [...olderLines, ...prev]);
      setHistoryCursor(historyJson.data.nextCursor);
      setHistoryHasMore(Boolean(historyJson.data.nextCursor));
    }
    setHistoryLoading(false);
  };

  const createSession = async () => {
    if (sessionBusy) return;
    setSessionBusy(true);
    try {
      const res = await fetch("/api/terminal/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, createNew: true, title: `Terminal ${sessions.length + 1}` })
      });
      const json = (await res.json()) as { data?: TerminalSessionItem };
      if (res.ok && json.data) {
        setSessions((prev) => [json.data as TerminalSessionItem, ...prev]);
        setSessionId(json.data.id);
        setHistory([]);
      }
    } finally {
      setSessionBusy(false);
    }
  };

  const renameSession = async () => {
    if (!sessionId || sessionBusy) return;
    const current = sessions.find((s) => s.id === sessionId);
    const nextTitle = window.prompt("Session name", current?.title ?? "Terminal");
    if (!nextTitle || !nextTitle.trim()) return;
    setSessionBusy(true);
    try {
      const res = await fetch(`/api/terminal/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle.trim() })
      });
      const json = (await res.json()) as { data?: TerminalSessionItem };
      if (res.ok && json.data) {
        setSessions((prev) => prev.map((s) => (s.id === sessionId ? (json.data as TerminalSessionItem) : s)));
      }
    } finally {
      setSessionBusy(false);
    }
  };

  const removeSession = async () => {
    if (!sessionId || sessionBusy || sessions.length <= 1) return;
    if (!window.confirm("Delete current terminal session?")) return;
    setSessionBusy(true);
    try {
      const removingId = sessionId;
      const res = await fetch(`/api/terminal/sessions/${removingId}`, { method: "DELETE" });
      if (res.ok) {
        const nextSessions = sessions.filter((s) => s.id !== removingId);
        setSessions(nextSessions);
        setSessionId(nextSessions[0]?.id ?? null);
        setHistory([]);
      }
    } finally {
      setSessionBusy(false);
    }
  };

  const runCmd = async (forcedCommand?: string) => {
    const cmd = (forcedCommand ?? input).trim();
    if (!cmd || !sessionId || busy) return;
    setCmdHistory((p) => [cmd, ...p.filter((x) => x !== cmd)]);
    setHistIdx(-1);
    setBusy(true);
    setLastRunStatus("running");
    setLastRunMs(null);
    const pendingAt = Date.now();
    const pendingCmdId = `pending:${pendingAt}:cmd`;
    const pendingInfoId = `pending:${pendingAt}:info`;
    const startedAt = performance.now();
    setHistory((p) => [
      ...p,
      { id: pendingCmdId, type: "cmd", text: cmd },
      { id: pendingInfoId, type: "info", text: "Running..." }
    ]);
    setInput("");

    try {
      const res = await fetch("/api/terminal/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, command: cmd, sessionId })
      });
      const json = (await res.json()) as { data?: TerminalExecution; error?: string };
      const run = json.data;
      if (run) {
        setRuns((prevRuns) => {
          if (prevRuns.some((r) => r.id === run.id)) return prevRuns;
          return [...prevRuns, run].sort((a, b) => a.sequence - b.sequence);
        });
        setHistory((prevHistory) => {
          const withoutPending = prevHistory.filter((l) => l.id !== pendingCmdId && l.id !== pendingInfoId);
          const cmdLineId = `${run.id}:cmd`;
          if (withoutPending.some((l) => l.id === cmdLineId)) return withoutPending;
          return [...withoutPending, ...runToLines(run)];
        });
        setLastRunStatus(run.status === "failed" ? "failed" : "completed");
      } else {
        setLastRunStatus("failed");
        const errAt = Date.now();
        const errorId = `pending:${errAt}:error`;
        const blankId = `pending:${errAt}:blank`;
        setHistory((p) => {
          const withoutPending = p.filter((l) => l.id !== pendingCmdId && l.id !== pendingInfoId);
          return [
            ...withoutPending,
            { id: errorId, type: "error", text: json.error ?? "Command fail ho gaya." },
            { id: blankId, type: "blank", text: "" }
          ];
        });
      }
    } finally {
      setLastRunMs(Math.round(performance.now() - startedAt));
      setBusy(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || (e.ctrlKey && e.key.toLowerCase() === "enter")) {
      void runCmd();
      return;
    }
    if (e.key === "Escape") {
      setInput("");
      return;
    }
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
        <div className="flex items-center gap-2 px-2 text-[10px] text-[var(--ide-muted)]">
          <select
            value={sessionId ?? ""}
            onChange={(e) => {
              setSessionId(e.target.value);
              setHistory([]);
            }}
            className="max-w-[150px] rounded border border-[var(--ide-border)] bg-[var(--ide-panel-2)] px-1 py-0.5 text-[10px] text-[var(--ide-text)] outline-none"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <button
            onClick={() => void createSession()}
            disabled={sessionBusy}
            className="rounded border border-[var(--ide-border)] bg-[var(--ide-panel-2)] px-1.5 py-0.5 text-[10px] disabled:opacity-40"
            title="New terminal session"
          >
            + New
          </button>
          <button
            onClick={() => void renameSession()}
            disabled={!sessionId || sessionBusy}
            className="rounded border border-[var(--ide-border)] bg-[var(--ide-panel-2)] px-1.5 py-0.5 text-[10px] disabled:opacity-40"
            title="Rename current session"
          >
            Rename
          </button>
          <button
            onClick={() => void removeSession()}
            disabled={!sessionId || sessionBusy || sessions.length <= 1}
            className="rounded border border-[var(--ide-border)] bg-[var(--ide-panel-2)] px-1.5 py-0.5 text-[10px] disabled:opacity-40"
            title="Delete current session"
          >
            Delete
          </button>
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              connection === "live" ? "bg-[#4ec9b0]" : connection === "connecting" ? "bg-[#e2c08d]" : "bg-[#f44747]"
            }`}
          />
          <span>{connection === "live" ? "Live" : connection === "connecting" ? "Connecting..." : "Offline"}</span>
          <button
            onClick={() => setHistory([])}
            title="Clear"
            className="grid h-6 w-6 place-items-center rounded text-[var(--ide-muted)] transition hover:bg-[var(--ide-panel-2)] hover:text-[var(--ide-text)]"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
          <button
            onClick={() => setMaximized((p) => !p)}
            title={maximized ? "Restore" : "Maximize"}
            className="grid h-6 w-6 place-items-center rounded text-[var(--ide-muted)] transition hover:bg-[var(--ide-panel-2)] hover:text-[var(--ide-text)]"
          >
            {maximized ? (
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M5 11H2V8M11 5h3v3M2 11l5-5M14 5l-5 5" />
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M2 5V2h3M11 2h3v3M14 11v3h-3M5 14H2v-3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
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
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  {COMMAND_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setInput(preset.command)}
                      className="rounded border border-[var(--ide-border)] bg-[var(--ide-panel)] px-2 py-0.5 text-[10px] text-[var(--ide-muted)] hover:text-[var(--ide-text)]"
                      title={`Use preset: ${preset.command}`}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    disabled={!retryCommand || busy}
                    onClick={() => void runCmd(retryCommand)}
                    className="rounded border border-[var(--ide-border)] bg-[var(--ide-panel)] px-2 py-0.5 text-[10px] text-[var(--ide-muted)] disabled:opacity-40"
                    title="Retry last command"
                  >
                    Retry last
                  </button>
                </div>
                <div className="mb-2 flex items-center gap-2 text-[11px]">
                  <input
                    value={historyQuery}
                    onChange={(e) => setHistoryQuery(e.target.value)}
                    placeholder="Filter history..."
                    className="w-44 rounded border border-[var(--ide-border)] bg-[var(--ide-panel)] px-2 py-1 text-[11px] text-[var(--ide-text)] outline-none"
                  />
                  <select
                    value={historyStatus}
                    onChange={(e) => setHistoryStatus(e.target.value as "all" | "completed" | "failed")}
                    className="rounded border border-[var(--ide-border)] bg-[var(--ide-panel)] px-2 py-1 text-[11px] text-[var(--ide-text)] outline-none"
                  >
                    <option value="all">All</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                  </select>
                  <button
                    disabled={!historyHasMore || historyLoading}
                    onClick={() => void loadMoreHistory()}
                    className="rounded border border-[var(--ide-border)] bg-[var(--ide-panel)] px-2 py-1 text-[10px] text-[var(--ide-muted)] disabled:opacity-40"
                  >
                    {historyLoading ? "Loading..." : "Load older"}
                  </button>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] ${
                      lastRunStatus === "failed"
                        ? "bg-[#4a2323] text-[#ffb3b3]"
                        : lastRunStatus === "completed"
                          ? "bg-[#1f3f33] text-[#9de5c6]"
                          : lastRunStatus === "running"
                            ? "bg-[#4e3d1e] text-[#f2d9a9]"
                            : "bg-[var(--ide-panel)] text-[var(--ide-muted)]"
                    }`}
                  >
                    {lastRunStatus === "idle" ? "Idle" : lastRunStatus}
                    {lastRunMs !== null && lastRunStatus !== "running" ? ` • ${lastRunMs}ms` : ""}
                  </span>
                  <span className="text-[10px] text-[var(--ide-muted)]">
                    Runs {runCount} • Fail {failedRuns}
                  </span>
                </div>
                {history.length === 0 && (
                  <div className="rounded border border-dashed border-[var(--ide-border)] p-2 text-[11px] text-[var(--ide-muted)]">
                    Terminal ready hai. Command run karein.
                  </div>
                )}
                {history.map((line) => {
                  if (line.type === "blank") return <div key={line.id} className="h-2" />;
                  return (
                    <div key={line.id} className="flex items-start">
                      {line.type === "cmd" && (
                        <span className="mr-1 select-none text-[#74a9ff]">PS C:\\coder&gt;&nbsp;</span>
                      )}
                      <span
                        className={
                          line.type === "ok"
                            ? "text-[#6fd4be]"
                            : line.type === "error"
                              ? "text-[#f44747]"
                              : line.type === "cmd"
                                ? "text-white"
                                : "text-[#8f90a2]"
                        }
                      >
                        {line.text}
                      </span>
                    </div>
                  );
                })}
                <div className="mt-2 flex items-center">
                  <span className="select-none text-[#74a9ff]">PS C:\\coder&gt;&nbsp;</span>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={!sessionId || busy}
                    className="flex-1 bg-transparent text-white outline-none caret-white disabled:opacity-50"
                    spellCheck={false}
                    autoComplete="off"
                    placeholder={busy ? "Running..." : "Type command"}
                  />
                </div>
                <div className="mt-1 text-[10px] text-[var(--ide-muted)]">
                  Enter run karega, Ctrl+Enter bhi run karega, Esc input clear karta hai.
                </div>
                <div ref={bottomRef} />
              </div>
            </motion.div>
          )}

          {activeTab === "problems" && (
            <motion.div
              key="problems"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="flex-1 overflow-auto bg-[#1e1e1e] p-2 font-mono text-[12px]"
            >
              {problems.length === 0 ? (
                <div className="px-2 py-3 text-[var(--ide-muted)]">Koi terminal errors detect nahi hue.</div>
              ) : (
                problems.map((p) => (
                  <div key={p.id} className="flex items-start gap-2 rounded px-2 py-1.5 hover:bg-[#2a2d2e]">
                    <span className={`mt-[3px] h-2 w-2 flex-shrink-0 rounded-full ${p.sev === "error" ? "bg-[#f44747]" : "bg-[#e2c08d]"}`} />
                    <div>
                      <span className="text-[#cccccc]">{p.file}</span>
                      <span className="text-[#858585]">:{p.line}:{p.col}</span>
                      <span className={`ml-2 ${p.sev === "error" ? "text-[#f44747]" : "text-[#e2c08d]"}`}>{p.sev}</span>
                      <span className="ml-2 text-[#858585]">{p.msg}</span>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === "output" && (
            <motion.div
              key="output"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="flex-1 overflow-auto bg-[#1e1e1e] p-3 font-mono text-[12px] leading-[1.7]"
            >
              {outputLines.length === 0 ? (
                <div className="text-[var(--ide-muted)]">Abhi output empty hai.</div>
              ) : (
                outputLines.map((l) => (
                  <div
                    key={l.id}
                    className={
                      l.type === "error"
                        ? "text-[#f44747]"
                        : l.type === "ok"
                          ? "text-[#4ec9b0]"
                          : "text-[#858585]"
                    }
                  >
                    {l.text}
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === "debug" && (
            <motion.div
              key="debug"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="flex flex-1 flex-col overflow-hidden bg-[#1e1e1e]"
            >
              <div className="flex-1 overflow-auto p-3 font-mono text-[12px] leading-[1.7] text-[#858585]">
                <div>Debug console simulated mode mein hai.</div>
                <div>Terminal execution events ko yahan aggregate kar sakte hain.</div>
                {history.slice(-8).map((h) => (
                  <div key={`dbg:${h.id}`}>{h.type.toUpperCase()}: {h.text}</div>
                ))}
              </div>
              <div className="flex items-center border-t border-[#3c3c3c] px-3 py-2 font-mono text-[12px]">
                <span className="select-none text-[#569cd6]">&gt;&nbsp;</span>
                <input
                  value={evalInput}
                  onChange={(e) => setEvalInput(e.target.value)}
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
