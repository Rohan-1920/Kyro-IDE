"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ExplorerPanel } from "@/components/ide/ExplorerPanel";
import type { ExplorerTreePayload } from "@/components/ide/ExplorerPanel";
import type { SidebarPanel } from "@/lib/types";

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  activeFilePath: string;
  onOpenFile: (fileId: string, path: string) => void;
  panelWidth?: number;
  projectId: string;
  explorerTree: ExplorerTreePayload | null;
  explorerTreeLoading: boolean;
  explorerTreeError: string | null;
  onExplorerRefresh: () => Promise<void>;
};

type ActivityItem = {
  id: SidebarPanel;
  title: string;
  icon: "files" | "search" | "git" | "ext" | "settings" | "specs" | "hooks";
};

const activityItems: ActivityItem[] = [
  { id: "explorer", title: "Explorer", icon: "files" },
  { id: "search", title: "Search", icon: "search" },
  { id: "git", title: "Source Control", icon: "git" },
  { id: "extensions", title: "Extensions", icon: "ext" },
  { id: "specs", title: "Specs", icon: "specs" },
  { id: "hooks", title: "Hooks", icon: "hooks" },
  { id: "settings", title: "Settings", icon: "settings" }
];

function ActivityIcon({ icon }: { icon: ActivityItem["icon"] }) {
  if (icon === "files") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h4l1.6 1.8H18.5A1.5 1.5 0 0 1 20 8.3v9.2a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-11z" />
      </svg>
    );
  }
  if (icon === "search") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4 4" />
      </svg>
    );
  }
  if (icon === "git") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="7" cy="6" r="2" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="10" r="2" />
        <path d="M7 8v8M9 7h4a4 4 0 0 1 4 4" />
      </svg>
    );
  }
  if (icon === "settings") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M11.5 3h1l.7 2.1a7.7 7.7 0 0 1 1.7.7l2-1 1 1.7-1.3 1.8c.3.5.5 1 .6 1.6l2.2.5v2l-2.2.5a7.8 7.8 0 0 1-.7 1.7l1.3 1.8-1 1.7-2-1a7.7 7.7 0 0 1-1.7.7L12.5 21h-1l-.7-2.1a7.7 7.7 0 0 1-1.7-.7l-2 1-1-1.7 1.3-1.8a7.8 7.8 0 0 1-.7-1.7L4.5 13v-2l2.2-.5c.1-.6.3-1.1.7-1.7L6.1 7l1-1.7 2 1a7.7 7.7 0 0 1 1.7-.7L11.5 3z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  if (icon === "specs") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M7 4h10M7 8h10M7 12h7M5 4h0M5 8h0M5 12h0" />
        <rect x="4" y="3" width="16" height="18" rx="2" />
      </svg>
    );
  }
  if (icon === "hooks") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M8 7a3 3 0 1 1 6 0v3a3 3 0 1 1-6 0V7z" />
        <path d="M6 14h12M6 18h12" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="4" y="4" width="7" height="7" rx="1.2" />
      <rect x="13" y="4" width="7" height="7" rx="1.2" />
      <rect x="4" y="13" width="7" height="7" rx="1.2" />
      <rect x="13" y="13" width="7" height="7" rx="1.2" />
    </svg>
  );
}

export function Sidebar({
  collapsed,
  onToggle,
  activeFilePath,
  onOpenFile,
  panelWidth = 280,
  projectId,
  explorerTree,
  explorerTreeLoading,
  explorerTreeError,
  onExplorerRefresh
}: SidebarProps) {
  const [activePanel, setActivePanel] = useState<SidebarPanel>("explorer");
  const [searchQuery, setSearchQuery] = useState("");
  const [panelBusy, setPanelBusy] = useState(false);
  const [panelError, setPanelError] = useState("");

  const [gitStatus, setGitStatus] = useState<null | {
    integration: null | {
      accountLogin: string;
      repoOwner?: string;
      repoName?: string;
      defaultBranch?: string;
      connectedAt: string;
    };
    jobs: Array<{ id: string; type: "sync" | "push" | "pull"; status: string; summary: string; createdAt: string }>;
    branch: string;
    dirty: boolean;
    ahead: number;
    behind: number;
  }>(null);
  const [connectForm, setConnectForm] = useState({ accountLogin: "", token: "" });
  const [repoForm, setRepoForm] = useState({ owner: "", repo: "", defaultBranch: "main" });
  const [commitMessage, setCommitMessage] = useState("");

  const [extensionRegistry, setExtensionRegistry] = useState<
    Array<{ id: string; name: string; publisher: string; version: string; description: string }>
  >([]);
  const [projectExtensions, setProjectExtensions] = useState<
    Array<{ extensionId: string; enabled: boolean; config: Record<string, unknown>; installedAt: string }>
  >([]);
  const [extensionQuery, setExtensionQuery] = useState("");
  const [extensionBusyId, setExtensionBusyId] = useState<string | null>(null);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsImportText, setSettingsImportText] = useState("");
  const [userEditor, setUserEditor] = useState({
    theme: "vs-dark",
    fontSize: 13,
    tabSize: 2,
    autoSave: false
  });
  const [workspaceEditor, setWorkspaceEditor] = useState<Partial<{
    theme: string;
    fontSize: number;
    tabSize: number;
    autoSave: boolean;
  }>>({});
  const [healthInfo, setHealthInfo] = useState<null | { service: string; status: string; timestamp: string }>(null);
  const [auditLogs, setAuditLogs] = useState<
    Array<{
      id: string;
      action: string;
      resourceType: string;
      resourceId: string;
      createdAt: string;
    }>
  >([]);
  const [auditLimit, setAuditLimit] = useState(40);
  const [auditQuery, setAuditQuery] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("all");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");
  const [auditCursor, setAuditCursor] = useState<string | null>(null);
  const [auditHasMore, setAuditHasMore] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [specsSnapshot, setSpecsSnapshot] = useState<null | {
    folders: number;
    files: number;
    extensionsInstalled: number;
    extensionsEnabled: number;
    githubConnected: boolean;
    branch: string;
    jobs: number;
    userTheme: string;
    workspaceOverrides: number;
  }>(null);
  const [specsWarnings, setSpecsWarnings] = useState<string[]>([]);
  const [specsScore, setSpecsScore] = useState<number | null>(null);

  const selectPanel = (id: SidebarPanel) => {
    if (id === activePanel && !collapsed) {
      onToggle();
      return;
    }
    if (collapsed) onToggle();
    setActivePanel(id);
  };

  const loadGithubStatus = async () => {
    setPanelError("");
    const response = await fetch(`/api/github/status?projectId=${projectId}`);
    const payload = (await response.json()) as { data?: typeof gitStatus; error?: string };
    if (!response.ok || !payload.data) {
      setPanelError(payload.error ?? "Git status load nahi hua.");
      setGitStatus(null);
      return;
    }
    setGitStatus(payload.data);
  };

  const loadExtensions = async () => {
    setPanelError("");
    const [registryRes, projectRes] = await Promise.all([
      fetch("/api/extensions/registry"),
      fetch(`/api/extensions/projects/${projectId}`)
    ]);
    const registryJson = (await registryRes.json()) as {
      data?: Array<{ id: string; name: string; publisher: string; version: string; description: string }>;
      error?: string;
    };
    const projectJson = (await projectRes.json()) as {
      data?: Array<{ extensionId: string; enabled: boolean; config: Record<string, unknown>; installedAt: string }>;
      error?: string;
    };
    if (!registryRes.ok || !projectRes.ok) {
      setPanelError(registryJson.error ?? projectJson.error ?? "Extensions load nahi huin.");
      return;
    }
    setExtensionRegistry(registryJson.data ?? []);
    setProjectExtensions(projectJson.data ?? []);
  };

  const loadSettings = async () => {
    setPanelError("");
    const [userRes, workspaceRes] = await Promise.all([
      fetch("/api/settings/user"),
      fetch(`/api/settings/workspace/${projectId}`)
    ]);
    const userJson = (await userRes.json()) as {
      data?: { editor: { theme: string; fontSize: number; tabSize: number; autoSave: boolean } };
      error?: string;
    };
    const workspaceJson = (await workspaceRes.json()) as {
      data?: {
        editorOverrides: Partial<{ theme: string; fontSize: number; tabSize: number; autoSave: boolean }>;
      };
      error?: string;
    };
    if (!userRes.ok || !workspaceRes.ok || !userJson.data || !workspaceJson.data) {
      setPanelError(userJson.error ?? workspaceJson.error ?? "Settings load nahi huin.");
      return;
    }
    setUserEditor(userJson.data.editor);
    setWorkspaceEditor(workspaceJson.data.editorOverrides ?? {});
  };

  const loadHooks = async (append = false) => {
    setPanelError("");
    setAuditLoading(true);
    const query = new URLSearchParams();
    query.set("limit", String(auditLimit));
    if (auditQuery.trim()) query.set("q", auditQuery.trim());
    if (auditActionFilter !== "all") query.set("actionPrefix", auditActionFilter);
    if (auditFrom) query.set("from", new Date(auditFrom).toISOString());
    if (auditTo) query.set("to", new Date(`${auditTo}T23:59:59.999`).toISOString());
    if (append && auditCursor) query.set("cursor", auditCursor);
    const [healthRes, auditRes] = await Promise.all([
      fetch("/api/health"),
      fetch(`/api/audit?${query.toString()}`)
    ]);
    const healthJson = (await healthRes.json()) as {
      data?: { service: string; status: string; timestamp: string };
      error?: string;
    };
    const auditJson = (await auditRes.json()) as {
      data?: {
        items: Array<{
          id: string;
          action: string;
          resourceType: string;
          resourceId: string;
          createdAt: string;
        }>;
        nextCursor: string | null;
      };
      error?: string;
    };
    if (!healthRes.ok || !auditRes.ok || !healthJson.data) {
      setPanelError(healthJson.error ?? auditJson.error ?? "Hooks panel load nahi hua.");
      setAuditLoading(false);
      return;
    }
    setHealthInfo(healthJson.data);
    const nextItems = auditJson.data?.items ?? [];
    setAuditLogs((prev) => (append ? [...prev, ...nextItems] : nextItems));
    setAuditCursor(auditJson.data?.nextCursor ?? null);
    setAuditHasMore(Boolean(auditJson.data?.nextCursor));
    setAuditLoading(false);
  };

  const loadSpecs = async () => {
    setPanelError("");
    const [treeRes, extRes, gitRes, userRes, workspaceRes] = await Promise.all([
      fetch(`/api/projects/${projectId}/tree`),
      fetch(`/api/extensions/projects/${projectId}`),
      fetch(`/api/github/status?projectId=${projectId}`),
      fetch("/api/settings/user"),
      fetch(`/api/settings/workspace/${projectId}`)
    ]);
    const treeJson = (await treeRes.json()) as {
      data?: { folders: Array<unknown>; files: Array<unknown> };
      error?: string;
    };
    const extJson = (await extRes.json()) as {
      data?: Array<{ enabled: boolean }>;
      error?: string;
    };
    const gitJson = (await gitRes.json()) as {
      data?: { integration: unknown; branch: string; jobs: Array<unknown> };
      error?: string;
    };
    const userJson = (await userRes.json()) as {
      data?: { editor: { theme: string } };
      error?: string;
    };
    const workspaceJson = (await workspaceRes.json()) as {
      data?: {
        editorOverrides: Partial<{ theme: string; fontSize: number; tabSize: number; autoSave: boolean }>;
      };
      error?: string;
    };

    if (!treeRes.ok || !extRes.ok || !gitRes.ok || !userRes.ok || !workspaceRes.ok) {
      setPanelError(
        treeJson.error ??
          extJson.error ??
          gitJson.error ??
          userJson.error ??
          workspaceJson.error ??
          "Specs load nahi hui."
      );
      return;
    }

    const extData = extJson.data ?? [];
    const overrides = workspaceJson.data?.editorOverrides ?? {};
    setSpecsSnapshot({
      folders: treeJson.data?.folders.length ?? 0,
      files: treeJson.data?.files.length ?? 0,
      extensionsInstalled: extData.length,
      extensionsEnabled: extData.filter((x) => x.enabled).length,
      githubConnected: !!gitJson.data?.integration,
      branch: gitJson.data?.branch ?? "main",
      jobs: gitJson.data?.jobs.length ?? 0,
      userTheme: userJson.data?.editor.theme ?? "vs-dark",
      workspaceOverrides: Object.keys(overrides).length
    });
    const warnings: string[] = [];
    let score = 100;
    if (!gitJson.data?.integration) {
      warnings.push("GitHub abhi connect nahi hai.");
      score -= 20;
    }
    if ((extJson.data ?? []).length === 0) {
      warnings.push("Koi extension install nahi hui.");
      score -= 10;
    }
    if ((treeJson.data?.files.length ?? 0) === 0) {
      warnings.push("Project mein files nahi hain.");
      score -= 25;
    }
    if (Object.keys(overrides).length === 0) {
      warnings.push("Workspace editor overrides set nahi hain.");
      score -= 5;
    }
    setSpecsWarnings(warnings);
    setSpecsScore(Math.max(0, score));
  };

  useEffect(() => {
    if (activePanel === "git") void loadGithubStatus();
    if (activePanel === "extensions") void loadExtensions();
    if (activePanel === "settings") void loadSettings();
    if (activePanel === "hooks") void loadHooks(false);
    if (activePanel === "specs") void loadSpecs();
  }, [activePanel, projectId, auditLimit, auditQuery, auditActionFilter, auditFrom, auditTo]);

  const runGitAction = async (fn: () => Promise<void>) => {
    setPanelBusy(true);
    setPanelError("");
    try {
      await fn();
      await loadGithubStatus();
    } catch {
      setPanelError("Git action fail hua.");
    } finally {
      setPanelBusy(false);
    }
  };

  const runExtensionAction = async (extensionId: string, fn: () => Promise<void>) => {
    setExtensionBusyId(extensionId);
    setPanelError("");
    try {
      await fn();
      await loadExtensions();
    } catch {
      setPanelError("Extension action fail hua.");
    } finally {
      setExtensionBusyId(null);
    }
  };

  const runSettingsAction = async (fn: () => Promise<void>) => {
    setSettingsBusy(true);
    setPanelError("");
    try {
      await fn();
      await loadSettings();
    } catch {
      setPanelError("Settings action fail hui.");
    } finally {
      setSettingsBusy(false);
    }
  };

  const installedIds = new Set(projectExtensions.map((x) => x.extensionId));
  const exportAudit = (format: "json" | "csv") => {
    const rows = auditLogs;
    const content =
      format === "json"
        ? JSON.stringify(rows, null, 2)
        : [
            "id,action,resourceType,resourceId,createdAt",
            ...rows.map((r) =>
              [r.id, r.action, r.resourceType, r.resourceId, r.createdAt]
                .map((x) => `"${String(x).replaceAll('"', '""')}"`)
                .join(",")
            )
          ].join("\n");
    const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-${projectId}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const visibleRegistry = extensionRegistry.filter((item) => {
    const q = extensionQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.publisher.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-full flex-shrink-0 border-r border-[var(--ide-border)] bg-[#1e1e22]">
      <div className="flex w-12 flex-col justify-between border-r border-[var(--ide-border)] bg-[#19191d]">
        <div className="pt-1">
          {activityItems.map((item) => {
            const active = item.id === activePanel && !collapsed;
            return (
              <button
                key={item.id}
                title={item.title}
                onClick={() => selectPanel(item.id)}
                className={`relative flex h-11 w-12 items-center justify-center ${
                  active ? "text-[#d7d7e0]" : "text-[#7f8092] hover:text-[#c9c9d3]"
                }`}
              >
                {active && <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r bg-[var(--ide-accent)]" />}
                <ActivityIcon icon={item.icon} />
              </button>
            );
          })}
        </div>
        <button
          onClick={onToggle}
          className="mb-1 h-10 w-12 text-[12px] text-[#7f8092] hover:text-[#c9c9d3]"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: panelWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-r border-[var(--ide-border)] bg-[var(--ide-panel)]"
          >
            <div className="flex h-full flex-col" style={{ width: panelWidth }}>
              <div className="border-b border-[var(--ide-border)] px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-[#a2a3b4]">
                {activePanel === "search"
                  ? "Search"
                  : activePanel === "git"
                    ? "Source Control"
                    : activePanel === "extensions"
                      ? "Extensions"
                      : activePanel === "specs"
                        ? "Specs"
                        : activePanel === "hooks"
                          ? "Hooks"
                      : activePanel === "settings"
                        ? "Settings"
                        : "Explorer"}
              </div>

              {activePanel === "search" && (
                <div className="border-b border-[var(--ide-border)] p-2.5">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search files..."
                    className="w-full rounded border border-[var(--ide-border)] bg-[#202028] px-2 py-1.5 text-[12px] text-[var(--ide-text)] outline-none placeholder:text-[#77788b]"
                  />
                </div>
              )}

              {(activePanel === "explorer" || activePanel === "search") && (
                <ExplorerPanel
                  projectId={projectId}
                  rawTree={explorerTree}
                  loading={explorerTreeLoading}
                  error={explorerTreeError}
                  activeFilePath={activeFilePath}
                  onRefresh={onExplorerRefresh}
                  onOpenFile={onOpenFile}
                  activePanel={activePanel === "search" ? "search" : "explorer"}
                  explorerQuery={searchQuery}
                />
              )}

              {activePanel === "git" && (
                <div className="thin-scroll flex-1 overflow-auto p-3 text-[12px]">
                  {panelError && (
                    <div className="mb-2 rounded border border-[#5a2d2d] bg-[#3a2222] px-2 py-1 text-[#ffb3b3]">
                      {panelError}
                    </div>
                  )}
                  <div className="mb-3 rounded border border-[var(--ide-border)] bg-[#202028] p-2">
                    <div className="mb-1 text-[11px] text-[var(--ide-muted)]">GitHub Account Connect</div>
                    <input
                      value={connectForm.accountLogin}
                      onChange={(e) => setConnectForm((p) => ({ ...p, accountLogin: e.target.value }))}
                      placeholder="account login"
                      className="mb-1 w-full rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-2 py-1 text-[12px] outline-none"
                    />
                    <input
                      value={connectForm.token}
                      onChange={(e) => setConnectForm((p) => ({ ...p, token: e.target.value }))}
                      placeholder="token"
                      className="mb-2 w-full rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-2 py-1 text-[12px] outline-none"
                    />
                    <button
                      disabled={panelBusy}
                      onClick={() =>
                        void runGitAction(async () => {
                          await fetch("/api/github/connect", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ projectId, ...connectForm })
                          });
                        })
                      }
                      className="rounded bg-[var(--ide-accent)] px-2 py-1 text-[11px] text-white disabled:opacity-50"
                    >
                      Connect
                    </button>
                  </div>

                  <div className="mb-3 rounded border border-[var(--ide-border)] bg-[#202028] p-2">
                    <div className="mb-1 text-[11px] text-[var(--ide-muted)]">Repo Link</div>
                    <input
                      value={repoForm.owner}
                      onChange={(e) => setRepoForm((p) => ({ ...p, owner: e.target.value }))}
                      placeholder="owner"
                      className="mb-1 w-full rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-2 py-1 text-[12px] outline-none"
                    />
                    <input
                      value={repoForm.repo}
                      onChange={(e) => setRepoForm((p) => ({ ...p, repo: e.target.value }))}
                      placeholder="repo"
                      className="mb-1 w-full rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-2 py-1 text-[12px] outline-none"
                    />
                    <input
                      value={repoForm.defaultBranch}
                      onChange={(e) => setRepoForm((p) => ({ ...p, defaultBranch: e.target.value }))}
                      placeholder="branch"
                      className="mb-2 w-full rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-2 py-1 text-[12px] outline-none"
                    />
                    <button
                      disabled={panelBusy}
                      onClick={() =>
                        void runGitAction(async () => {
                          await fetch("/api/github/repo", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ projectId, ...repoForm })
                          });
                        })
                      }
                      className="rounded border border-[var(--ide-border)] bg-[var(--ide-panel-2)] px-2 py-1 text-[11px]"
                    >
                      Link Repo
                    </button>
                  </div>

                  <div className="mb-3 rounded border border-[var(--ide-border)] bg-[#202028] p-2">
                    <div className="mb-1 text-[11px] text-[var(--ide-muted)]">Operations</div>
                    <div className="mb-2 flex gap-1">
                      {(["sync", "pull", "push"] as const).map((op) => (
                        <button
                          key={op}
                          disabled={panelBusy}
                          onClick={() =>
                            void runGitAction(async () => {
                              await fetch("/api/github/sync", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ projectId, operation: op })
                              });
                            })
                          }
                          className="rounded border border-[var(--ide-border)] bg-[var(--ide-panel-2)] px-2 py-1 text-[11px] capitalize"
                        >
                          {op}
                        </button>
                      ))}
                    </div>
                    <input
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      placeholder="Commit message"
                      className="mb-1 w-full rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-2 py-1 text-[12px] outline-none"
                    />
                    <button
                      disabled={panelBusy || commitMessage.trim().length < 3}
                      onClick={() =>
                        void runGitAction(async () => {
                          await fetch("/api/github/commit", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ projectId, message: commitMessage })
                          });
                          setCommitMessage("");
                        })
                      }
                      className="rounded bg-[var(--ide-accent)] px-2 py-1 text-[11px] text-white disabled:opacity-50"
                    >
                      Commit + Push
                    </button>
                  </div>

                  <div className="rounded border border-[var(--ide-border)] bg-[#202028] p-2">
                    <div className="mb-1 text-[11px] text-[var(--ide-muted)]">Status</div>
                    {!gitStatus ? (
                      <div className="text-[11px] text-[#85869a]">Status load ho raha hai...</div>
                    ) : (
                      <>
                        <div className="text-[11px] text-[#c9c9d3]">
                          {gitStatus.integration
                            ? `${gitStatus.integration.accountLogin} • ${gitStatus.integration.repoOwner ?? "owner"}/${gitStatus.integration.repoName ?? "repo"}`
                            : "GitHub connect nahi hai"}
                        </div>
                        <div className="mb-2 text-[10px] text-[#85869a]">
                          branch {gitStatus.branch} • ahead {gitStatus.ahead} • behind {gitStatus.behind}
                        </div>
                        <div className="space-y-1">
                          {gitStatus.jobs.slice(0, 4).map((job) => (
                            <div key={job.id} className="rounded border border-[var(--ide-border)] px-2 py-1 text-[10px]">
                              <div className="capitalize text-[#c9c9d3]">
                                {job.type} • {job.status}
                              </div>
                              <div className="text-[#85869a]">{job.summary}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {activePanel === "extensions" && (
                <div className="thin-scroll flex-1 overflow-auto p-3 text-[12px]">
                  {panelError && (
                    <div className="mb-2 rounded border border-[#5a2d2d] bg-[#3a2222] px-2 py-1 text-[#ffb3b3]">
                      {panelError}
                    </div>
                  )}
                  <input
                    value={extensionQuery}
                    onChange={(e) => setExtensionQuery(e.target.value)}
                    placeholder="Search extensions..."
                    className="mb-2 w-full rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-2 py-1.5 text-[12px] outline-none"
                  />
                  <div className="space-y-2">
                    {visibleRegistry.map((ext) => {
                      const installed = projectExtensions.find((x) => x.extensionId === ext.id);
                      return (
                        <div key={ext.id} className="rounded border border-[var(--ide-border)] bg-[#202028] p-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-[12px] text-[#d7d7e0]">{ext.name}</div>
                              <div className="text-[10px] text-[#85869a]">
                                {ext.publisher} • v{ext.version}
                              </div>
                            </div>
                            {!installedIds.has(ext.id) ? (
                              <button
                                disabled={extensionBusyId === ext.id}
                                onClick={() =>
                                  void runExtensionAction(ext.id, async () => {
                                    await fetch(`/api/extensions/projects/${projectId}`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ extensionId: ext.id, config: {} })
                                    });
                                  })
                                }
                                className="rounded bg-[var(--ide-accent)] px-2 py-1 text-[10px] text-white disabled:opacity-50"
                              >
                                Install
                              </button>
                            ) : (
                              <button
                                disabled={extensionBusyId === ext.id}
                                onClick={() =>
                                  void runExtensionAction(ext.id, async () => {
                                    await fetch(`/api/extensions/projects/${projectId}/${ext.id}`, {
                                      method: "DELETE"
                                    });
                                  })
                                }
                                className="rounded border border-[var(--ide-border)] bg-[var(--ide-panel-2)] px-2 py-1 text-[10px]"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <p className="mt-1 text-[10px] text-[#85869a]">{ext.description}</p>
                          {installed && (
                            <div className="mt-2 flex items-center justify-between rounded border border-[var(--ide-border)] px-2 py-1">
                              <span className="text-[10px] text-[#c9c9d3]">Installed</span>
                              <button
                                disabled={extensionBusyId === ext.id}
                                onClick={() =>
                                  void runExtensionAction(ext.id, async () => {
                                    await fetch(`/api/extensions/projects/${projectId}/${ext.id}`, {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ enabled: !installed.enabled })
                                    });
                                  })
                                }
                                className={`rounded px-2 py-0.5 text-[10px] ${
                                  installed.enabled ? "bg-[#1e4d32] text-[#b8f0ce]" : "bg-[#4e3d1e] text-[#f2d9a9]"
                                }`}
                              >
                                {installed.enabled ? "Enabled" : "Disabled"}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {visibleRegistry.length === 0 && (
                      <div className="rounded border border-dashed border-[var(--ide-border)] p-3 text-[11px] text-[#85869a]">
                        Koi extension match nahi hui.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activePanel === "settings" && (
                <div className="thin-scroll flex-1 overflow-auto p-3 text-[12px]">
                  {panelError && (
                    <div className="mb-2 rounded border border-[#5a2d2d] bg-[#3a2222] px-2 py-1 text-[#ffb3b3]">
                      {panelError}
                    </div>
                  )}

                  <div className="mb-3 rounded border border-[var(--ide-border)] bg-[#202028] p-2">
                    <div className="mb-2 text-[11px] text-[var(--ide-muted)]">User Editor Defaults</div>
                    <input
                      value={userEditor.theme}
                      onChange={(e) => setUserEditor((p) => ({ ...p, theme: e.target.value }))}
                      placeholder="theme"
                      className="mb-1 w-full rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-2 py-1 text-[12px] outline-none"
                    />
                    <div className="mb-1 flex gap-1">
                      <input
                        type="number"
                        value={userEditor.fontSize}
                        onChange={(e) => setUserEditor((p) => ({ ...p, fontSize: Number(e.target.value) || 12 }))}
                        placeholder="font size"
                        className="w-1/2 rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-2 py-1 text-[12px] outline-none"
                      />
                      <input
                        type="number"
                        value={userEditor.tabSize}
                        onChange={(e) => setUserEditor((p) => ({ ...p, tabSize: Number(e.target.value) || 2 }))}
                        placeholder="tab size"
                        className="w-1/2 rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-2 py-1 text-[12px] outline-none"
                      />
                    </div>
                    <label className="mb-2 flex items-center gap-2 text-[11px] text-[#c9c9d3]">
                      <input
                        type="checkbox"
                        checked={userEditor.autoSave}
                        onChange={(e) => setUserEditor((p) => ({ ...p, autoSave: e.target.checked }))}
                      />
                      Auto Save
                    </label>
                    <button
                      disabled={settingsBusy}
                      onClick={() =>
                        void runSettingsAction(async () => {
                          await fetch("/api/settings/user", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ editor: userEditor })
                          });
                        })
                      }
                      className="rounded bg-[var(--ide-accent)] px-2 py-1 text-[11px] text-white disabled:opacity-50"
                    >
                      Save User Settings
                    </button>
                  </div>

                  <div className="mb-3 rounded border border-[var(--ide-border)] bg-[#202028] p-2">
                    <div className="mb-2 text-[11px] text-[var(--ide-muted)]">Workspace Overrides</div>
                    <input
                      value={workspaceEditor.theme ?? ""}
                      onChange={(e) => setWorkspaceEditor((p) => ({ ...p, theme: e.target.value || undefined }))}
                      placeholder="theme override"
                      className="mb-1 w-full rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-2 py-1 text-[12px] outline-none"
                    />
                    <div className="mb-1 flex gap-1">
                      <input
                        type="number"
                        value={workspaceEditor.fontSize ?? ""}
                        onChange={(e) =>
                          setWorkspaceEditor((p) => ({
                            ...p,
                            fontSize: e.target.value ? Number(e.target.value) : undefined
                          }))
                        }
                        placeholder="font size override"
                        className="w-1/2 rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-2 py-1 text-[12px] outline-none"
                      />
                      <input
                        type="number"
                        value={workspaceEditor.tabSize ?? ""}
                        onChange={(e) =>
                          setWorkspaceEditor((p) => ({
                            ...p,
                            tabSize: e.target.value ? Number(e.target.value) : undefined
                          }))
                        }
                        placeholder="tab size override"
                        className="w-1/2 rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-2 py-1 text-[12px] outline-none"
                      />
                    </div>
                    <label className="mb-2 flex items-center gap-2 text-[11px] text-[#c9c9d3]">
                      <input
                        type="checkbox"
                        checked={!!workspaceEditor.autoSave}
                        onChange={(e) => setWorkspaceEditor((p) => ({ ...p, autoSave: e.target.checked }))}
                      />
                      Auto Save override
                    </label>
                    <div className="flex gap-2">
                      <button
                        disabled={settingsBusy}
                        onClick={() =>
                          void runSettingsAction(async () => {
                            await fetch(`/api/settings/workspace/${projectId}`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ editorOverrides: workspaceEditor })
                            });
                          })
                        }
                        className="rounded bg-[var(--ide-accent)] px-2 py-1 text-[11px] text-white disabled:opacity-50"
                      >
                        Save Overrides
                      </button>
                      <button
                        disabled={settingsBusy}
                        onClick={() => setWorkspaceEditor({})}
                        className="rounded border border-[var(--ide-border)] bg-[var(--ide-panel-2)] px-2 py-1 text-[11px]"
                      >
                        Clear Local
                      </button>
                    </div>
                  </div>

                  <div className="rounded border border-[var(--ide-border)] bg-[#202028] p-2">
                    <div className="mb-2 text-[11px] text-[var(--ide-muted)]">Import / Export</div>
                    <div className="mb-2 flex gap-2">
                      <button
                        disabled={settingsBusy}
                        onClick={() =>
                          void runSettingsAction(async () => {
                            const res = await fetch(`/api/settings/export?projectId=${projectId}`);
                            const json = (await res.json()) as { data?: unknown };
                            if (res.ok && json.data) {
                              setSettingsImportText(JSON.stringify(json.data, null, 2));
                            }
                          })
                        }
                        className="rounded border border-[var(--ide-border)] bg-[var(--ide-panel-2)] px-2 py-1 text-[11px]"
                      >
                        Export to JSON
                      </button>
                      <button
                        disabled={settingsBusy || !settingsImportText.trim()}
                        onClick={() =>
                          void runSettingsAction(async () => {
                            const parsed = JSON.parse(settingsImportText) as {
                              userSettings?: { editor?: { theme: string; fontSize: number; tabSize: number; autoSave: boolean } };
                              workspaceSettings?: {
                                editorOverrides?: Partial<{
                                  theme: string;
                                  fontSize: number;
                                  tabSize: number;
                                  autoSave: boolean;
                                }>;
                              };
                            };
                            await fetch("/api/settings/import", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                projectId,
                                userSettings: parsed.userSettings?.editor,
                                workspaceOverrides: parsed.workspaceSettings?.editorOverrides
                              })
                            });
                          })
                        }
                        className="rounded bg-[var(--ide-accent)] px-2 py-1 text-[11px] text-white disabled:opacity-50"
                      >
                        Import JSON
                      </button>
                    </div>
                    <textarea
                      value={settingsImportText}
                      onChange={(e) => setSettingsImportText(e.target.value)}
                      placeholder="Paste exported settings JSON yahan..."
                      rows={10}
                      className="w-full rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-2 py-1 text-[11px] outline-none"
                    />
                  </div>
                </div>
              )}

              {activePanel === "specs" && (
                <div className="thin-scroll flex-1 overflow-auto p-3 text-[12px]">
                  {panelError && (
                    <div className="mb-2 rounded border border-[#5a2d2d] bg-[#3a2222] px-2 py-1 text-[#ffb3b3]">
                      {panelError}
                    </div>
                  )}
                  {!specsSnapshot ? (
                    <div className="text-[#85869a]">Specs load ho rahi hain...</div>
                  ) : (
                    <div className="space-y-2">
                      <div className="rounded border border-[var(--ide-border)] bg-[#202028] p-2">
                        <div className="text-[11px] text-[var(--ide-muted)]">Readiness Score</div>
                        <div className="text-[18px] font-semibold text-[#d7d7e0]">{specsScore ?? 0}/100</div>
                        {specsWarnings.length > 0 ? (
                          <ul className="mt-1 space-y-1 text-[10px] text-[#e2c08d]">
                            {specsWarnings.map((w) => (
                              <li key={w}>- {w}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-[10px] text-[#6fd4be]">Sab checks healthy lag rahe hain.</div>
                        )}
                      </div>
                      <div className="rounded border border-[var(--ide-border)] bg-[#202028] p-2">
                        <div className="text-[11px] text-[var(--ide-muted)]">Project Tree</div>
                        <div className="text-[12px] text-[#d7d7e0]">
                          {specsSnapshot.folders} folders • {specsSnapshot.files} files
                        </div>
                      </div>
                      <div className="rounded border border-[var(--ide-border)] bg-[#202028] p-2">
                        <div className="text-[11px] text-[var(--ide-muted)]">Extensions</div>
                        <div className="text-[12px] text-[#d7d7e0]">
                          Installed {specsSnapshot.extensionsInstalled} • Enabled {specsSnapshot.extensionsEnabled}
                        </div>
                      </div>
                      <div className="rounded border border-[var(--ide-border)] bg-[#202028] p-2">
                        <div className="text-[11px] text-[var(--ide-muted)]">Git</div>
                        <div className="text-[12px] text-[#d7d7e0]">
                          {specsSnapshot.githubConnected ? "Connected" : "Not connected"} • branch {specsSnapshot.branch}
                        </div>
                        <div className="text-[10px] text-[#85869a]">{specsSnapshot.jobs} recent job(s)</div>
                      </div>
                      <div className="rounded border border-[var(--ide-border)] bg-[#202028] p-2">
                        <div className="text-[11px] text-[var(--ide-muted)]">Editor Baseline</div>
                        <div className="text-[12px] text-[#d7d7e0]">Theme: {specsSnapshot.userTheme}</div>
                        <div className="text-[10px] text-[#85869a]">
                          Workspace overrides: {specsSnapshot.workspaceOverrides}
                        </div>
                      </div>
                      <button
                        onClick={() => void loadSpecs()}
                        className="rounded border border-[var(--ide-border)] bg-[var(--ide-panel-2)] px-2 py-1 text-[11px]"
                      >
                        Refresh Specs
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activePanel === "hooks" && (
                <div className="thin-scroll flex-1 overflow-auto p-3 text-[12px]">
                  {panelError && (
                    <div className="mb-2 rounded border border-[#5a2d2d] bg-[#3a2222] px-2 py-1 text-[#ffb3b3]">
                      {panelError}
                    </div>
                  )}
                  <div className="mb-3 rounded border border-[var(--ide-border)] bg-[#202028] p-2">
                    <div className="mb-1 text-[11px] text-[var(--ide-muted)]">Service Health</div>
                    {!healthInfo ? (
                      <div className="text-[#85869a]">Health check pending...</div>
                    ) : (
                      <>
                        <div className="text-[12px] text-[#d7d7e0]">
                          {healthInfo.service} • {healthInfo.status}
                        </div>
                        <div className="text-[10px] text-[#85869a]">
                          {new Date(healthInfo.timestamp).toLocaleString()}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[11px] text-[var(--ide-muted)]">Audit Trail</div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => exportAudit("json")}
                        className="rounded border border-[var(--ide-border)] bg-[var(--ide-panel-2)] px-2 py-0.5 text-[10px]"
                      >
                        JSON
                      </button>
                      <button
                        onClick={() => exportAudit("csv")}
                        className="rounded border border-[var(--ide-border)] bg-[var(--ide-panel-2)] px-2 py-0.5 text-[10px]"
                      >
                        CSV
                      </button>
                      <button
                        onClick={() => void loadHooks(false)}
                        className="rounded border border-[var(--ide-border)] bg-[var(--ide-panel-2)] px-2 py-0.5 text-[10px]"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                  <div className="mb-2 grid grid-cols-3 gap-1">
                    <input
                      value={auditQuery}
                      onChange={(e) => setAuditQuery(e.target.value)}
                      placeholder="Search"
                      className="col-span-2 rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-2 py-1 text-[11px] outline-none"
                    />
                    <select
                      value={auditActionFilter}
                      onChange={(e) => setAuditActionFilter(e.target.value)}
                      className="rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-1 py-1 text-[11px] outline-none"
                    >
                      <option value="all">All</option>
                      <option value="github.">Git</option>
                      <option value="extension.">Ext</option>
                      <option value="settings.">Settings</option>
                    </select>
                  </div>
                  <div className="mb-2 grid grid-cols-2 gap-1">
                    <input
                      type="date"
                      value={auditFrom}
                      onChange={(e) => setAuditFrom(e.target.value)}
                      className="rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-2 py-1 text-[11px] outline-none"
                    />
                    <input
                      type="date"
                      value={auditTo}
                      onChange={(e) => setAuditTo(e.target.value)}
                      className="rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-2 py-1 text-[11px] outline-none"
                    />
                  </div>
                  <div className="mb-2 flex items-center justify-between text-[10px] text-[#85869a]">
                    <span>{auditLogs.length} event(s)</span>
                    <div className="flex items-center gap-1">
                      <span>Limit</span>
                      <select
                        value={auditLimit}
                        onChange={(e) => setAuditLimit(Number(e.target.value))}
                        className="rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-1 py-0.5 text-[10px] outline-none"
                      >
                        {[20, 40, 80, 120].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {auditLogs.length === 0 ? (
                      <div className="rounded border border-dashed border-[var(--ide-border)] p-2 text-[11px] text-[#85869a]">
                        Audit events abhi available nahi.
                      </div>
                    ) : (
                      auditLogs.map((item) => (
                        <div key={item.id} className="rounded border border-[var(--ide-border)] bg-[#202028] px-2 py-1">
                          <div className="text-[11px] text-[#d7d7e0]">{item.action}</div>
                          <div className="text-[10px] text-[#85869a]">
                            {item.resourceType}:{item.resourceId}
                          </div>
                          <div className="text-[10px] text-[#85869a]">
                            {new Date(item.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-[#85869a]">
                    <span>{auditLoading ? "Loading..." : auditHasMore ? "More events available" : "End of results"}</span>
                    <button
                      disabled={!auditHasMore || auditLoading}
                      onClick={() => void loadHooks(true)}
                      className="rounded border border-[var(--ide-border)] bg-[var(--ide-panel-2)] px-2 py-0.5 text-[10px] disabled:opacity-40"
                    >
                      Load more
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
