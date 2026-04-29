"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const menuItems = ["File", "Edit", "Selection", "View", "Go", "Run", "Terminal", "Help"];

type TopNavbarProps = {
  onCommand: (command: string) => void;
  authState?: "authenticated" | "unauthenticated" | "loading";
  userName?: string;
  onAuthAction?: () => void;
  projects?: Array<{ id: string; name: string }>;
  activeProjectId?: string;
  onSelectProject?: (projectId: string) => void;
  onCreateProject?: () => void;
  onRenameProject?: () => void;
  onDeleteProject?: () => void;
};

const commandItems = [
  { id: "toggleSidebar", label: "Toggle Sidebar", shortcut: "Ctrl+B" },
  { id: "toggleLearning", label: "Toggle Learning Mode", shortcut: "Ctrl+L" },
  { id: "toggleAi", label: "Toggle AI Panel", shortcut: "Ctrl+I" },
  { id: "focusTerminal", label: "Focus Terminal", shortcut: "Ctrl+`" },
  { id: "runCode", label: "Run Current File", shortcut: "Ctrl+Enter" }
];

export function TopNavbar({
  onCommand,
  authState = "loading",
  userName,
  onAuthAction,
  projects = [],
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject
}: TopNavbarProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filteredCommands = useMemo(
    () => commandItems.filter((c) => c.label.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  return (
    <>
      <header className="relative z-50 flex h-full select-none items-center border-b border-[var(--ide-border)] bg-[var(--ide-panel)]">
        <div className="flex h-full items-center gap-2 border-r border-[var(--ide-border)] px-3">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-[var(--ide-accent)]">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
              <path d="M2 4.5L6.5 8 2 11.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 11.5h5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-[13px] font-semibold tracking-tight text-[var(--ide-text)]">Coder</span>
        </div>

        <nav className="flex h-full items-center">
          {menuItems.map((item) => (
            <button
              key={item}
              className="flex h-full items-center px-2.5 text-[12px] text-[var(--ide-text)] hover:bg-[var(--ide-panel-2)]"
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="ml-2 mr-1 flex items-center gap-1 border-l border-[var(--ide-border)] pl-2">
          <select
            value={activeProjectId ?? ""}
            onChange={(e) => onSelectProject?.(e.target.value)}
            className="h-7 rounded border border-[var(--ide-border)] bg-[var(--ide-panel-2)] px-2 text-[11px] text-[var(--ide-text)] outline-none"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button onClick={onCreateProject} className="rounded bg-[var(--ide-panel-2)] px-2 py-1 text-[10px]">+</button>
          <button onClick={onRenameProject} className="rounded bg-[var(--ide-panel-2)] px-2 py-1 text-[10px]">R</button>
          <button onClick={onDeleteProject} className="rounded bg-[var(--ide-panel-2)] px-2 py-1 text-[10px]">D</button>
        </div>

        <div className="flex flex-1 items-center justify-center px-4">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex h-[26px] w-full max-w-[380px] items-center gap-2 rounded-md border border-[var(--ide-border)] bg-[var(--ide-panel-2)] px-3 text-[12px] text-[var(--ide-muted)]"
          >
            <span>Search files, symbols, commands</span>
            <kbd className="ml-auto rounded border border-white/10 px-1.5 py-px text-[10px]">Ctrl+P</kbd>
          </button>
        </div>

        <div className="flex items-center gap-2 px-2">
          <button
            onClick={() => onCommand("runCode")}
            className="rounded border border-[var(--ide-border)] bg-[var(--ide-panel-2)] px-2.5 py-1 text-[11px] text-[var(--ide-text)] hover:bg-[#31313a]"
          >
            Run
          </button>
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              authState === "authenticated" ? "bg-[#4ec9b0]" : authState === "loading" ? "bg-[#e2c08d]" : "bg-[#f44747]"
            }`}
            title={authState}
          />
          <button
            onClick={onAuthAction}
            className="rounded border border-[var(--ide-border)] bg-[var(--ide-panel-2)] px-2.5 py-1 text-[11px] text-[var(--ide-text)] hover:bg-[#31313a]"
          >
            {authState === "authenticated" ? "Logout" : authState === "loading" ? "Checking..." : "Login"}
          </button>
          <button
            className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--ide-accent)] px-2 text-[10px] font-bold text-white"
            title={userName ?? "Guest"}
          >
            {(userName ?? "G").slice(0, 1).toUpperCase()}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {paletteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 pt-[10vh]"
            onClick={() => setPaletteOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-auto w-full max-w-[560px] overflow-hidden rounded-md border border-[var(--ide-border)] bg-[var(--ide-panel)] shadow-vsc-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type command..."
                className="w-full border-b border-[var(--ide-border)] bg-transparent px-4 py-3 text-[13px] text-[var(--ide-text)] outline-none placeholder:text-[var(--ide-muted)]"
              />
              <div className="max-h-[320px] overflow-auto">
                {filteredCommands.map((cmd) => (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      onCommand(cmd.id);
                      setPaletteOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[12px] text-[var(--ide-text)] hover:bg-[var(--ide-panel-2)]"
                  >
                    <span>{cmd.label}</span>
                    <span className="text-[var(--ide-muted)]">{cmd.shortcut}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
