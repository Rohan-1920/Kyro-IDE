"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AIChatPanel } from "@/components/ide/AIChatPanel";
import { BottomTerminalPanel } from "@/components/ide/BottomTerminalPanel";
import { EditorArea } from "@/components/ide/EditorArea";
import type { ExplorerTreePayload } from "@/components/ide/ExplorerPanel";
import { FloatingAIButton } from "@/components/ide/FloatingAIButton";
import { OnboardingModal } from "@/components/ide/OnboardingModal";
import { Sidebar } from "@/components/ide/Sidebar";
import { TopNavbar } from "@/components/ide/TopNavbar";
import { initialMessages } from "@/lib/ide-data";
import type { ChatMessage, CodeFile, TabItem } from "@/lib/types";
import type { ProjectFileRecord } from "@/lib/server/types";

type OpenTab = { fileId: string; path: string };

function projectFileToCodeFile(record: ProjectFileRecord): CodeFile {
  return {
    fileId: record.id,
    name: record.name,
    path: record.path,
    language: record.language,
    content: record.content,
    modified: false
  };
}

type AuthUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

type ProjectSummary = {
  id: string;
  name: string;
  description?: string;
};

export default function Home() {
  const [projects, setProjects]                 = useState<ProjectSummary[]>([]);
  const [activeProjectId, setActiveProjectId]   = useState("proj_demo_1");
  const [recentProjectIds, setRecentProjectIds] = useState<string[]>([]);
  const [projectModal, setProjectModal]         = useState<null | "create" | "rename" | "delete">(null);
  const [projectForm, setProjectForm]           = useState({ name: "", description: "" });
  const [projectBusy, setProjectBusy]           = useState(false);
  const [projectError, setProjectError]         = useState("");
  const [shellReady, setShellReady]               = useState(false);
  const [authStatus, setAuthStatus]               = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [authUser, setAuthUser]                   = useState<AuthUser | null>(null);
  const [authMode, setAuthMode]                   = useState<"login" | "signup">("login");
  const [authForm, setAuthForm]                   = useState({ name: "", email: "", password: "" });
  const [authError, setAuthError]                 = useState("");
  const [authBusy, setAuthBusy]                   = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAiPanel, setShowAiPanel]           = useState(true);
  const [sidebarWidth, setSidebarWidth]         = useState(280);
  const [aiPanelWidth, setAiPanelWidth]         = useState(340);
  const [learningMode, setLearningMode]         = useState(true);
  const [onboardingOpen, setOnboardingOpen]     = useState(false);
  const [selectedLevel, setSelectedLevel]       = useState("Beginner");
  const [input, setInput]                       = useState("");
  const [isTyping, setIsTyping]                 = useState(false);
  const [messages, setMessages]                 = useState<ChatMessage[]>(initialMessages);
  const [explorerTree, setExplorerTree]         = useState<ExplorerTreePayload | null>(null);
  const [explorerTreeLoading, setExplorerTreeLoading] = useState(false);
  const [explorerTreeError, setExplorerTreeError]       = useState<string | null>(null);
  const [openTabs, setOpenTabs]                 = useState<OpenTab[]>([]);
  const [activeFileId, setActiveFileId]         = useState<string | null>(null);
  const [fileById, setFileById]                 = useState<Record<string, CodeFile>>({});
  const [dirtyFileIds, setDirtyFileIds]         = useState<Set<string>>(() => new Set());
  const [fileLoadingId, setFileLoadingId]       = useState<string | null>(null);
  const [savingFile, setSavingFile]             = useState(false);
  const dirtyRef = useRef<Set<string>>(new Set());
  dirtyRef.current = dirtyFileIds;
  const fileByIdRef = useRef(fileById);
  fileByIdRef.current = fileById;
  const [terminalHeight, setTerminalHeight]     = useState(220);
  const [cursorPos, setCursorPos]               = useState({ line: 1, column: 1 });

  useEffect(() => {
    const raw = window.localStorage.getItem("coder.ide.layout.v1");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<{
          sidebarCollapsed: boolean;
          showAiPanel: boolean;
          sidebarWidth: number;
          aiPanelWidth: number;
          terminalHeight: number;
        }>;
        if (typeof parsed.sidebarCollapsed === "boolean") setSidebarCollapsed(parsed.sidebarCollapsed);
        if (typeof parsed.showAiPanel === "boolean") setShowAiPanel(parsed.showAiPanel);
        if (typeof parsed.sidebarWidth === "number") setSidebarWidth(parsed.sidebarWidth);
        if (typeof parsed.aiPanelWidth === "number") setAiPanelWidth(parsed.aiPanelWidth);
        if (typeof parsed.terminalHeight === "number") setTerminalHeight(parsed.terminalHeight);
      } catch {
        window.localStorage.removeItem("coder.ide.layout.v1");
      }
    }
    setShellReady(true);
  }, []);

  const refreshSession = async () => {
    setAuthStatus("loading");
    const res = await fetch("/api/auth/me");
    if (!res.ok) {
      setAuthStatus("unauthenticated");
      setAuthUser(null);
      return;
    }
    const payload = (await res.json()) as { data?: AuthUser };
    if (!payload.data) {
      setAuthStatus("unauthenticated");
      setAuthUser(null);
      return;
    }
    setAuthUser(payload.data);
    setAuthStatus("authenticated");
  };

  const fetchProjects = async () => {
    const response = await fetch("/api/projects");
    if (!response.ok) return;
    const payload = (await response.json()) as { data?: ProjectSummary[] };
    const list = payload.data ?? [];
    setProjects(list);
    if (list.length === 0) return;
    const saved = window.localStorage.getItem("coder.ide.lastProjectId");
    const hasSaved = saved && list.some((p) => p.id === saved);
    const nextId = hasSaved ? (saved as string) : list[0].id;
    setActiveProjectId(nextId);
    setRecentProjectIds((prev) => {
      const merged = [nextId, ...prev.filter((id) => id !== nextId)];
      return merged.slice(0, 6);
    });
  };

  useEffect(() => {
    if (!shellReady) return;
    void refreshSession();
  }, [shellReady]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    void fetchProjects();
  }, [authStatus]);

  const refreshExplorerTree = useCallback(async (overrideProjectId?: string) => {
    const pid = overrideProjectId ?? activeProjectId;
    if (!pid) return;
    setExplorerTreeLoading(true);
    setExplorerTreeError(null);
    try {
      const res = await fetch(`/api/projects/${pid}/tree`);
      const json = (await res.json()) as { data?: ExplorerTreePayload; error?: string };
      if (!res.ok || !json.data) {
        setExplorerTreeError(json.error ?? "Tree fetch failed");
        setExplorerTree(null);
        return;
      }
      setExplorerTree(json.data);
    } catch {
      setExplorerTreeError("Tree fetch failed");
      setExplorerTree(null);
    } finally {
      setExplorerTreeLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    void refreshExplorerTree();
  }, [authStatus, activeProjectId, refreshExplorerTree]);

  useEffect(() => {
    if (!explorerTree) return;
    const ids = new Set(explorerTree.files.map((f) => f.id));
    setOpenTabs((prev) =>
      prev
        .filter((t) => ids.has(t.fileId))
        .map((t) => {
          const f = explorerTree.files.find((x) => x.id === t.fileId);
          return f ? { fileId: t.fileId, path: f.path } : t;
        })
    );
    setFileById((prev) => {
      const next: Record<string, CodeFile> = {};
      for (const id of Object.keys(prev)) {
        const f = explorerTree.files.find((x) => x.id === id);
        if (!f) continue;
        const cur = prev[id];
        if (!dirtyRef.current.has(id)) {
          next[id] = projectFileToCodeFile(f);
        } else {
          next[id] = {
            ...cur,
            path: f.path,
            name: f.name,
            language: f.language
          };
        }
      }
      return next;
    });
  }, [explorerTree]);

  useEffect(() => {
    if (!activeFileId) return;
    if (!openTabs.some((t) => t.fileId === activeFileId)) {
      setActiveFileId(openTabs[0]?.fileId ?? null);
    }
  }, [openTabs, activeFileId]);

  useEffect(() => {
    setOpenTabs([]);
    setActiveFileId(null);
    setFileById({});
    setDirtyFileIds(new Set());
  }, [activeProjectId]);

  useEffect(() => {
    if (!shellReady) return;
    window.localStorage.setItem(
      "coder.ide.layout.v1",
      JSON.stringify({
        sidebarCollapsed,
        showAiPanel,
        sidebarWidth,
        aiPanelWidth,
        terminalHeight
      })
    );
  }, [shellReady, sidebarCollapsed, showAiPanel, sidebarWidth, aiPanelWidth, terminalHeight]);

  useEffect(() => {
    if (!activeProjectId) return;
    window.localStorage.setItem("coder.ide.lastProjectId", activeProjectId);
  }, [activeProjectId]);

  const activeFilePath = openTabs.find((t) => t.fileId === activeFileId)?.path ?? "";
  const activeFile = activeFileId ? fileById[activeFileId] ?? null : null;

  const tabItems: TabItem[] = openTabs.map((t) => {
    const cf = fileById[t.fileId];
    const name = cf?.name ?? t.path.split("/").pop() ?? t.path;
    return {
      fileId: t.fileId,
      name,
      path: t.path,
      ext: name.includes(".") ? name.split(".").pop() : undefined,
      modified: dirtyFileIds.has(t.fileId),
      active: t.fileId === activeFileId
    };
  });

  const handleOpenFile = async (fileId: string, path: string) => {
    setOpenTabs((prev) => {
      if (prev.some((x) => x.fileId === fileId)) return prev;
      return [...prev, { fileId, path }];
    });
    setActiveFileId(fileId);
    if (fileByIdRef.current[fileId]) return;
    setFileLoadingId(fileId);
    try {
      const res = await fetch(`/api/projects/${activeProjectId}/files/${fileId}`);
      const json = (await res.json()) as { data?: ProjectFileRecord; error?: string };
      if (!res.ok || !json.data) return;
      setFileById((prev) => ({ ...prev, [fileId]: projectFileToCodeFile(json.data!) }));
    } finally {
      setFileLoadingId((id) => (id === fileId ? null : id));
    }
  };

  const handleCloseTab = (path?: string) => {
    if (!path) return;
    setOpenTabs((prev) => {
      const idx = prev.findIndex((t) => t.path === path);
      if (idx < 0) return prev;
      const closing = prev[idx];
      const next = prev.filter((_, i) => i !== idx);
      setDirtyFileIds((s) => {
        const n = new Set(s);
        n.delete(closing.fileId);
        return n;
      });
      if (activeFileId === closing.fileId) {
        const fallback = next[Math.max(0, idx - 1)] ?? next[0];
        setActiveFileId(fallback?.fileId ?? null);
      }
      return next;
    });
  };

  const handleEditorChange = (content: string) => {
    if (!activeFileId) return;
    setFileById((prev) => {
      const cur = prev[activeFileId];
      if (!cur) return prev;
      return { ...prev, [activeFileId]: { ...cur, content } };
    });
    setDirtyFileIds((s) => new Set(s).add(activeFileId));
  };

  const handleSaveFile = async () => {
    if (!activeFileId || !dirtyFileIds.has(activeFileId)) return;
    const content = fileById[activeFileId]?.content;
    if (content === undefined) return;
    setSavingFile(true);
    try {
      const res = await fetch(`/api/projects/${activeProjectId}/files/${activeFileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      if (!res.ok) return;
      setDirtyFileIds((s) => {
        const n = new Set(s);
        n.delete(activeFileId);
        return n;
      });
      await refreshExplorerTree();
    } finally {
      setSavingFile(false);
    }
  };

  const runCommand = (command: string) => {
    if (command === "toggleSidebar") setSidebarCollapsed((p) => !p);
    if (command === "toggleLearning") setLearningMode((p) => !p);
    if (command === "toggleAi") setShowAiPanel((p) => !p);
    if (command === "focusTerminal") setTerminalHeight(280);
    if (command === "runCode") setShowAiPanel(true);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!event.ctrlKey) return;
      const key = event.key.toLowerCase();
      if (key === "b") {
        event.preventDefault();
        setSidebarCollapsed((p) => !p);
      }
      if (key === "l") {
        event.preventDefault();
        setLearningMode((p) => !p);
      }
      if (key === "i") {
        event.preventDefault();
        setShowAiPanel((p) => !p);
      }
      if (key === "`") {
        event.preventDefault();
        setTerminalHeight(280);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  const startSidebarResize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const start = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      const next = Math.max(220, Math.min(420, start + (ev.clientX - startX)));
      setSidebarWidth(next);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const startAiResize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const start = aiPanelWidth;
    const onMove = (ev: MouseEvent) => {
      const next = Math.max(280, Math.min(520, start + (startX - ev.clientX)));
      setAiPanelWidth(next);
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
          projectId: activeProjectId,
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
      if (authStatus === "authenticated") {
        const me = await fetch("/api/auth/me");
        if (me.status === 401) {
          setAuthStatus("unauthenticated");
          setAuthUser(null);
        }
      }
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

  const submitProjectAction = async () => {
    if (!activeProjectId && projectModal !== "create") return;
    setProjectBusy(true);
    setProjectError("");
    try {
      const modalKind = projectModal;
      let createdProjectId: string | undefined;
      if (modalKind === "create") {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: projectForm.name, description: projectForm.description })
        });
        const json = (await res.json()) as { error?: string; data?: ProjectSummary };
        if (!res.ok || !json.data) {
          setProjectError(json.error ?? "Project create failed");
          return;
        }
        createdProjectId = json.data.id;
        setProjects((prev) => [json.data as ProjectSummary, ...prev]);
        setActiveProjectId(createdProjectId);
      }
      if (modalKind === "rename") {
        const res = await fetch(`/api/projects/${activeProjectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: projectForm.name, description: projectForm.description })
        });
        const json = (await res.json()) as { error?: string; data?: ProjectSummary };
        if (!res.ok || !json.data) {
          setProjectError(json.error ?? "Project rename failed");
          return;
        }
        setProjects((prev) => prev.map((p) => (p.id === activeProjectId ? (json.data as ProjectSummary) : p)));
      }
      let nextProjectIdAfterDelete: string | undefined;
      if (modalKind === "delete") {
        const res = await fetch(`/api/projects/${activeProjectId}`, { method: "DELETE" });
        if (!res.ok) {
          const json = (await res.json()) as { error?: string };
          setProjectError(json.error ?? "Project delete failed");
          return;
        }
        setProjects((prev) => {
          const next = prev.filter((p) => p.id !== activeProjectId);
          nextProjectIdAfterDelete = next[0]?.id;
          if (next[0]) setActiveProjectId(next[0].id);
          return next;
        });
      }
      setProjectForm({ name: "", description: "" });
      setProjectModal(null);
      await fetchProjects();
      if (createdProjectId) await refreshExplorerTree(createdProjectId);
      else if (modalKind === "delete" && nextProjectIdAfterDelete)
        await refreshExplorerTree(nextProjectIdAfterDelete);
      else if (modalKind === "delete" && !nextProjectIdAfterDelete) setExplorerTree(null);
      else await refreshExplorerTree();
    } finally {
      setProjectBusy(false);
    }
  };

  const submitAuth = async () => {
    setAuthBusy(true);
    setAuthError("");
    const route = authMode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const payload =
      authMode === "login"
        ? { email: authForm.email, password: authForm.password }
        : { name: authForm.name, email: authForm.email, password: authForm.password };
    try {
      const res = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setAuthError(json.error ?? "Auth failed");
        return;
      }
      setAuthForm({ name: "", email: "", password: "" });
      await refreshSession();
    } finally {
      setAuthBusy(false);
    }
  };

  const continueAsDemo = async () => {
    setAuthBusy(true);
    setAuthError("");
    try {
      await fetch("/api/auth/demo", { method: "POST" });
      await refreshSession();
    } finally {
      setAuthBusy(false);
    }
  };

  const doLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthUser(null);
    setAuthStatus("unauthenticated");
  };

  if (!shellReady) {
    return (
      <div className="flex h-screen flex-col bg-[var(--ide-bg)] p-3">
        <div className="mb-3 h-9 animate-pulse rounded bg-[var(--ide-panel)]" />
        <div className="flex min-h-0 flex-1 gap-3">
          <div className="w-72 animate-pulse rounded bg-[var(--ide-panel)]" />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex-1 animate-pulse rounded bg-[var(--ide-panel)]" />
            <div className="h-48 animate-pulse rounded bg-[var(--ide-panel)]" />
          </div>
          <div className="hidden w-80 animate-pulse rounded bg-[var(--ide-panel)] xl:block" />
        </div>
      </div>
    );
  }

  if (authStatus !== "authenticated") {
    return (
      <div className="grid h-screen place-items-center bg-[var(--ide-bg)] px-4">
        <div className="w-full max-w-md rounded-lg border border-[var(--ide-border)] bg-[var(--ide-panel)] p-5">
          <h1 className="text-[18px] font-semibold text-[var(--ide-text)]">Welcome to Coder IDE</h1>
          <p className="mt-1 text-[12px] text-[var(--ide-muted)]">
            Login ya signup karein, ya demo mode mein continue karein.
          </p>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setAuthMode("login")}
              className={`rounded px-3 py-1.5 text-[12px] ${
                authMode === "login" ? "bg-[var(--ide-accent)] text-white" : "bg-[var(--ide-panel-2)] text-[var(--ide-text)]"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode("signup")}
              className={`rounded px-3 py-1.5 text-[12px] ${
                authMode === "signup" ? "bg-[var(--ide-accent)] text-white" : "bg-[var(--ide-panel-2)] text-[var(--ide-text)]"
              }`}
            >
              Signup
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {authMode === "signup" && (
              <input
                value={authForm.name}
                onChange={(e) => setAuthForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Name"
                className="w-full rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-3 py-2 text-[12px] outline-none"
              />
            )}
            <input
              value={authForm.email}
              onChange={(e) => setAuthForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="Email"
              className="w-full rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-3 py-2 text-[12px] outline-none"
            />
            <input
              type="password"
              value={authForm.password}
              onChange={(e) => setAuthForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Password"
              className="w-full rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-3 py-2 text-[12px] outline-none"
            />
          </div>

          {authError && <p className="mt-2 text-[11px] text-[#f44747]">{authError}</p>}

          <div className="mt-4 flex gap-2">
            <button
              onClick={submitAuth}
              disabled={authBusy}
              className="rounded bg-[var(--ide-accent)] px-3 py-2 text-[12px] text-white disabled:opacity-50"
            >
              {authBusy ? "Please wait..." : authMode === "login" ? "Login" : "Create account"}
            </button>
            <button
              onClick={continueAsDemo}
              disabled={authBusy}
              className="rounded border border-[var(--ide-border)] bg-[var(--ide-panel-2)] px-3 py-2 text-[12px] text-[var(--ide-text)] disabled:opacity-50"
            >
              Continue as Demo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--ide-bg)] text-[var(--ide-text)]">

      {/* ── Title bar ── */}
      <div className="h-9 flex-shrink-0">
        <TopNavbar
          onCommand={runCommand}
          authState={authStatus}
          userName={authUser?.name}
          onAuthAction={doLogout}
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          activeProjectId={activeProjectId}
          onSelectProject={(projectId) => {
            setActiveProjectId(projectId);
            setRecentProjectIds((prev) => [projectId, ...prev.filter((id) => id !== projectId)].slice(0, 6));
          }}
          onCreateProject={() => {
            setProjectForm({ name: "", description: "" });
            setProjectModal("create");
          }}
          onRenameProject={() => {
            const current = projects.find((p) => p.id === activeProjectId);
            setProjectForm({ name: current?.name ?? "", description: current?.description ?? "" });
            setProjectModal("rename");
          }}
          onDeleteProject={() => setProjectModal("delete")}
        />
      </div>

      {/* ── Main IDE area ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* Sidebar — manages its own width */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((p) => !p)}
          activeFilePath={activeFilePath}
          onOpenFile={handleOpenFile}
          panelWidth={sidebarWidth}
          projectId={activeProjectId}
          explorerTree={explorerTree}
          explorerTreeLoading={explorerTreeLoading}
          explorerTreeError={explorerTreeError}
          onExplorerRefresh={refreshExplorerTree}
        />
        {!sidebarCollapsed && (
          <div
            onMouseDown={startSidebarResize}
            className="hidden w-[4px] cursor-col-resize bg-[var(--ide-border)] hover:bg-[var(--ide-accent)] lg:block"
            title="Resize sidebar"
          />
        )}

        {/* Center column: editor + terminal */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

          {/* Editor — flex-1 */}
          <div className="min-h-0 flex-1 overflow-hidden">
            {openTabs.length === 0 ? (
              <div className="grid h-full place-items-center bg-[var(--ide-bg)]">
                <div className="rounded border border-dashed border-[var(--ide-border)] p-4 text-center text-[12px] text-[var(--ide-muted)]">
                  Koi file open nahi. Explorer se file kholein.
                </div>
              </div>
            ) : (
              <EditorArea
                learningMode={learningMode}
                onToggleLearningMode={() => setLearningMode((p) => !p)}
                activeFile={activeFile}
                tabs={tabItems}
                onSelectTab={(path) => {
                  if (!path) return;
                  const t = openTabs.find((x) => x.path === path);
                  if (t) setActiveFileId(t.fileId);
                }}
                onCloseTab={handleCloseTab}
                onCursorChange={(line, column) => setCursorPos({ line, column })}
                onChangeContent={handleEditorChange}
                onSave={handleSaveFile}
                fileLoading={!!activeFileId && fileLoadingId === activeFileId}
                saveDisabled={!activeFileId || !dirtyFileIds.has(activeFileId)}
                saving={savingFile}
              />
            )}
          </div>

          {/* Terminal — fixed height */}
          <div
            onMouseDown={startTerminalResize}
            className="h-[4px] cursor-row-resize bg-[var(--ide-border)] hover:bg-[var(--ide-accent)]"
            title="Resize terminal"
          />
          <div className="flex-shrink-0 overflow-hidden border-t border-[var(--ide-border)]" style={{ height: terminalHeight }}>
            <BottomTerminalPanel projectId={activeProjectId} />
          </div>
        </div>

        {/* AI Chat panel — right column on xl */}
        {showAiPanel && (
          <div
            onMouseDown={startAiResize}
            className="hidden w-[4px] cursor-col-resize bg-[var(--ide-border)] hover:bg-[var(--ide-accent)] xl:block"
            title="Resize AI panel"
          />
        )}
        <AIChatPanel
          isOpen={showAiPanel}
          messages={messages}
          input={input}
          isTyping={isTyping}
          desktopWidth={aiPanelWidth}
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
            {projects.find((p) => p.id === activeProjectId)?.name ?? "workspace"}
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
          <span>{activeFile?.language ?? "—"}</span>
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
      {projectModal && (
        <div className="fixed inset-0 z-[210] grid place-items-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded border border-[var(--ide-border)] bg-[var(--ide-panel)] p-4">
            <h2 className="text-[14px] font-semibold text-[var(--ide-text)]">
              {projectModal === "create" ? "Create Project" : projectModal === "rename" ? "Rename Project" : "Delete Project"}
            </h2>
            {projectModal !== "delete" ? (
              <div className="mt-3 space-y-2">
                <input
                  value={projectForm.name}
                  onChange={(e) => setProjectForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Project name"
                  className="w-full rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-3 py-2 text-[12px] outline-none"
                />
                <input
                  value={projectForm.description}
                  onChange={(e) => setProjectForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Description (optional)"
                  className="w-full rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-3 py-2 text-[12px] outline-none"
                />
              </div>
            ) : (
              <p className="mt-3 text-[12px] text-[var(--ide-muted)]">
                Are you sure? Project and related local workspace state remove ho jayegi.
              </p>
            )}
            {projectError && <p className="mt-2 text-[11px] text-[#f44747]">{projectError}</p>}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-[10px] text-[var(--ide-muted)]">
                Recent: {recentProjectIds.map((id) => projects.find((p) => p.id === id)?.name ?? id).join(" • ")}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setProjectModal(null)}
                  className="rounded border border-[var(--ide-border)] bg-[var(--ide-panel-2)] px-3 py-1.5 text-[12px]"
                >
                  Cancel
                </button>
                <button
                  onClick={submitProjectAction}
                  disabled={projectBusy}
                  className="rounded bg-[var(--ide-accent)] px-3 py-1.5 text-[12px] text-white disabled:opacity-50"
                >
                  {projectBusy ? "Saving..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
