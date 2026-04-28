"use client";

import { useEffect, useState } from "react";
import { AIChatPanel } from "@/components/ide/AIChatPanel";
import { BottomTerminalPanel } from "@/components/ide/BottomTerminalPanel";
import { EditorArea } from "@/components/ide/EditorArea";
import { FloatingAIButton } from "@/components/ide/FloatingAIButton";
import { OnboardingModal } from "@/components/ide/OnboardingModal";
import { Sidebar } from "@/components/ide/Sidebar";
import { TopNavbar } from "@/components/ide/TopNavbar";
import { initialMessages, mockFiles } from "@/lib/ide-data";
import type { ChatMessage, TabItem } from "@/lib/types";

export default function Home() {
  const projectId = "proj_demo_1";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAiPanel, setShowAiPanel]           = useState(true);
  const [learningMode, setLearningMode]         = useState(true);
  const [onboardingOpen, setOnboardingOpen]     = useState(false);
  const [selectedLevel, setSelectedLevel]       = useState("Beginner");
  const [input, setInput]                       = useState("");
  const [isTyping, setIsTyping]                 = useState(false);
  const [messages, setMessages]                 = useState<ChatMessage[]>(initialMessages);
  const [activeFilePath, setActiveFilePath]     = useState("src/App.tsx");
  const [terminalHeight, setTerminalHeight]     = useState(220);
  const [cursorPos, setCursorPos]               = useState({ line: 1, column: 1 });
  const [openFilePaths, setOpenFilePaths]       = useState<string[]>([
    "src/App.tsx",
    "src/components/ChatPanel.tsx",
    "src/styles.css",
    "src/lib/utils.ts"
  ]);

  useEffect(() => {
    // Keep demo UX working for unauthenticated visitors.
    void fetch("/api/auth/demo", { method: "POST" }).catch(() => undefined);
  }, []);

  const activeFile = mockFiles.find((f) => f.path === activeFilePath) ?? mockFiles[0];
  const openTabs: TabItem[] = mockFiles
    .filter((f) => openFilePaths.includes(f.path))
    .map((f) => ({
    name: f.name,
    path: f.path,
    ext: f.name.split(".").pop(),
    modified: !!f.modified,
    active: f.path === activeFilePath
    }));

  const handleOpenFile = (path: string) => {
    setOpenFilePaths((prev) => (prev.includes(path) ? prev : [...prev, path]));
    setActiveFilePath(path);
  };

  const handleCloseTab = (path?: string) => {
    if (!path) return;
    setOpenFilePaths((prev) => {
      if (!prev.includes(path) || prev.length === 1) return prev;
      const next = prev.filter((p) => p !== path);
      if (activeFilePath === path) {
        const closedIndex = prev.indexOf(path);
        const fallback = next[Math.max(0, closedIndex - 1)] ?? next[0];
        if (fallback) setActiveFilePath(fallback);
      }
      return next;
    });
  };

  const runCommand = (command: string) => {
    if (command === "toggleSidebar") setSidebarCollapsed((p) => !p);
    if (command === "toggleLearning") setLearningMode((p) => !p);
    if (command === "toggleAi") setShowAiPanel((p) => !p);
    if (command === "focusTerminal") setTerminalHeight(280);
  };

  const startTerminalResize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = terminalHeight;
    const onMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY;
      const next = Math.max(150, Math.min(420, startHeight + delta));
      setTerminalHeight(next);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const inferAction = (value: string): "explain" | "fix" | "optimize" | "general" => {
    const q = value.toLowerCase();
    if (q.includes("explain")) return "explain";
    if (q.includes("fix") || q.includes("error") || q.includes("bug")) return "fix";
    if (q.includes("optimize")) return "optimize";
    return "general";
  };

  const sendMessage = async () => {
    const value = input.trim();
    if (!value) return;
    const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    setMessages((p) => [...p, { type: "user", text: value, timestamp: now }]);
    setInput("");
    setIsTyping(true);
    setMessages((p) => [...p, { type: "ai", text: "", timestamp: now }]);
    try {
      const response = await fetch("/api/ai/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          message: value,
          action: inferAction(value),
          activeFilePath,
          selectedCode: ""
        })
      });
      if (!response.body || !response.ok) throw new Error("Stream failed");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(chunk, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const payload = JSON.parse(part.slice(6)) as { chunk?: string };
          if (!payload.chunk) continue;
          setMessages((prev) => {
            const next = [...prev];
            const idx = next.length - 1;
            if (idx >= 0 && next[idx].type === "ai") {
              next[idx] = { ...next[idx], text: `${next[idx].text}${payload.chunk}` };
            }
            return next;
          });
        }
      }
    } catch {
      setMessages((p) => {
        const next = [...p];
        const idx = next.length - 1;
        if (idx >= 0 && next[idx].type === "ai") {
          next[idx] = {
            ...next[idx],
            text: "AI stream issue aaya, lekin backend ready hai. Dobara try karo."
          };
        }
        return next;
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--ide-bg)] text-[var(--ide-text)]">

      {/* ── Title bar ── */}
      <div className="h-9 flex-shrink-0">
        <TopNavbar onCommand={runCommand} />
      </div>

      {/* ── Main IDE area ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* Sidebar — manages its own width */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((p) => !p)}
          activeFilePath={activeFilePath}
          onOpenFile={handleOpenFile}
        />

        {/* Center column: editor + terminal */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

          {/* Editor — flex-1 */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <EditorArea
              learningMode={learningMode}
              onToggleLearningMode={() => setLearningMode((p) => !p)}
              activeFile={activeFile}
              tabs={openTabs}
              onSelectTab={(path) => path && setActiveFilePath(path)}
              onCloseTab={handleCloseTab}
              onCursorChange={(line, column) => setCursorPos({ line, column })}
            />
          </div>

          {/* Terminal — fixed height */}
          <div
            onMouseDown={startTerminalResize}
            className="h-[4px] cursor-row-resize bg-[var(--ide-border)] hover:bg-[var(--ide-accent)]"
            title="Resize terminal"
          />
          <div className="flex-shrink-0 overflow-hidden border-t border-[var(--ide-border)]" style={{ height: terminalHeight }}>
            <BottomTerminalPanel />
          </div>
        </div>

        {/* AI Chat panel — right column on xl */}
        <AIChatPanel
          isOpen={showAiPanel}
          messages={messages}
          input={input}
          isTyping={isTyping}
          onInputChange={setInput}
          onClose={() => setShowAiPanel(false)}
          onSend={sendMessage}
        />
      </div>

      {/* ── Bottom status bar ── */}
      <div className="flex h-[22px] flex-shrink-0 items-center justify-between bg-[var(--ide-accent)] px-3 text-[11px] text-white">
        {/* Left */}
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="2"/>
              <circle cx="6" cy="10" r="2"/>
              <circle cx="10" cy="6" r="2"/>
              <path d="M6 8v0M8 6h0"/>
            </svg>
            main
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f44747]" />
            1 error
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#e2c08d]" />
            1 warning
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
          <span>Ln {cursorPos.line}, Col {cursorPos.column}</span>
          <span>{activeFile.language}</span>
          <span>UTF-8</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4ec9b0] shadow-[0_0_4px_rgba(78,201,176,0.8)]" />
            ✦ Coder AI
          </span>
        </div>
      </div>

      {/* Floating AI button (mobile) */}
      <FloatingAIButton
        onClick={() => setShowAiPanel((p) => !p)}
        isOpen={showAiPanel}
      />

      {/* Onboarding modal */}
      <OnboardingModal
        open={onboardingOpen}
        selectedLevel={selectedLevel}
        onSelectLevel={setSelectedLevel}
        onStart={() => setOnboardingOpen(false)}
      />
    </div>
  );
}
