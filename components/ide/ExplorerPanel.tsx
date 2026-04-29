"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { FolderRecord, ProjectFileRecord } from "@/lib/server/types";
import {
  buildExplorerTree,
  flattenExplorerFiles,
  parentDir,
  type ExplorerFileNode,
  type ExplorerFolderNode
} from "@/lib/explorer/build-tree";
import { inferLanguageFromFileName, joinPath } from "@/lib/explorer/file-utils";

export type ExplorerTreePayload = { folders: FolderRecord[]; files: ProjectFileRecord[] };

type ExplorerPanelProps = {
  projectId: string;
  rawTree: ExplorerTreePayload | null;
  loading: boolean;
  error: string | null;
  activeFilePath: string;
  onRefresh: () => Promise<void>;
  onOpenFile: (fileId: string, path: string) => void;
  activePanel: "explorer" | "search";
  explorerQuery: string;
};

type ContextTarget =
  | { kind: "root" }
  | { kind: "folder"; folderNode: ExplorerFolderNode }
  | { kind: "file"; fileNode: ExplorerFileNode };

type ModalState =
  | null
  | { mode: "newFile" | "newFolder"; parentPath: string };

async function resolveFolderIdAtPath(
  projectId: string,
  targetPath: string,
  seedFolders: FolderRecord[]
): Promise<{ folderId: string | null; error?: string }> {
  if (!targetPath) return { folderId: null };
  const segments = targetPath.split("/").filter(Boolean);
  let acc = "";
  let currentParentId: string | null = null;
  const map = new Map(seedFolders.map((f) => [f.path, f]));

  for (const seg of segments) {
    acc = acc ? `${acc}/${seg}` : seg;
    let existing = map.get(acc);
    if (!existing) {
      const res = await fetch(`/api/projects/${projectId}/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: acc,
          name: seg,
          parentFolderId: currentParentId
        })
      });
      const json = (await res.json()) as { data?: FolderRecord; error?: string };
      if (!res.ok || !json.data) return { folderId: null, error: json.error ?? "Folder ban na saka" };
      existing = json.data;
      map.set(acc, existing);
    }
    currentParentId = existing.id;
  }
  return { folderId: currentParentId };
}

export function ExplorerPanel({
  projectId,
  rawTree,
  loading,
  error,
  activeFilePath,
  onRefresh,
  onOpenFile,
  activePanel,
  explorerQuery
}: ExplorerPanelProps) {
  const tree = useMemo(
    () => (rawTree ? buildExplorerTree(rawTree.folders, rawTree.files) : null),
    [rawTree]
  );

  const flatFiles = useMemo(() => (tree ? flattenExplorerFiles(tree) : []), [tree]);

  const filteredFiles = useMemo(() => {
    const q = explorerQuery.trim().toLowerCase();
    if (!q) return flatFiles;
    return flatFiles.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.path.toLowerCase().includes(q)
    );
  }, [flatFiles, explorerQuery]);

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([""]));
  useEffect(() => {
    if (!tree) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      const walk = (node: ExplorerFolderNode) => {
        next.add(node.path);
        for (const c of node.children) {
          if (c.kind === "folder") walk(c);
        }
      };
      walk(tree);
      return next;
    });
  }, [tree]);

  const [ctx, setCtx] = useState<{ x: number; y: number; target: ContextTarget } | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [modalName, setModalName] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [renameDraft, setRenameDraft] = useState<{ kind: "file" | "folder"; id: string; value: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ctx && !(e.target as HTMLElement).closest?.("[data-explorer-ctx]")) setCtx(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [ctx]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  const toggleExpanded = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const refresh = useCallback(async () => {
    await onRefresh();
  }, [onRefresh]);

  const copyPath = (path: string) => {
    void navigator.clipboard.writeText(path).then(() => setToast("Path clipboard par copy ho gayi"));
  };

  const handleDeleteFiles = useCallback(
    async (ids: string[]) => {
      setBusy(true);
      try {
        await Promise.all(
          ids.map((fileId) =>
            fetch(`/api/projects/${projectId}/files/${fileId}`, { method: "DELETE" })
          )
        );
        setSelectedIds(new Set());
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [projectId, refresh]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.size > 0 && activePanel === "explorer") {
        const t = e.target as HTMLElement;
        if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
        e.preventDefault();
        void handleDeleteFiles([...selectedIds]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds, activePanel, handleDeleteFiles]);

  const submitModal = async () => {
    if (!modal || !tree) return;
    const name = modalName.trim();
    if (name.length < 2) {
      setToast("Naam kam az kam 2 chars ka ho");
      return;
    }
    setBusy(true);
    try {
      if (modal.mode === "newFile") {
        const path = joinPath(modal.parentPath, name);
        const lang = inferLanguageFromFileName(name);
        const res = await fetch(`/api/projects/${projectId}/files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path,
            name,
            language: lang,
            content: ""
          })
        });
        const json = (await res.json()) as { data?: { id: string }; error?: string };
        if (!res.ok || !json.data) {
          setToast(json.error ?? "File create fail");
          return;
        }
        setModal(null);
        setModalName("");
        await refresh();
        onOpenFile(json.data.id, path);
      } else {
        const parentPath = modal.parentPath;
        const path = joinPath(parentPath, name);
        const parentResolved = await resolveFolderIdAtPath(projectId, parentPath, rawTree?.folders ?? []);
        if (parentResolved.error) {
          setToast(parentResolved.error);
          return;
        }
        const res = await fetch(`/api/projects/${projectId}/folders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path,
            name,
            parentFolderId: parentResolved.folderId
          })
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          setToast(json.error ?? "Folder create fail");
          return;
        }
        setModal(null);
        setModalName("");
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const submitRename = async () => {
    if (!renameDraft || !rawTree) return;
    const next = renameDraft.value.trim();
    if (next.length < 1) return;
    setBusy(true);
    try {
      if (renameDraft.kind === "file") {
        const file = rawTree.files.find((f) => f.id === renameDraft.id);
        if (!file) return;
        const dir = parentDir(file.path);
        const newPath = joinPath(dir, next);
        const res = await fetch(`/api/projects/${projectId}/files/${file.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: next, path: newPath })
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          setToast(json.error ?? "Rename fail");
          return;
        }
      } else {
        const folder = rawTree.folders.find((f) => f.id === renameDraft.id);
        if (!folder) return;
        const dir = parentDir(folder.path);
        const newPath = joinPath(dir, next);
        const res = await fetch(`/api/projects/${projectId}/folders/${folder.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: next, path: newPath })
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          setToast(json.error ?? "Rename fail");
          return;
        }
      }
      setRenameDraft(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const deleteFolder = async (node: ExplorerFolderNode) => {
    if (node.isVirtual) {
      setToast("Virtual folder delete API se nahi hoti — files khali karke real folder use karein");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/folders/${node.id}`, { method: "DELETE" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setToast(json.error ?? "Folder delete blocked");
        return;
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const deleteFile = async (fileId: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/files/${fileId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setToast(json.error ?? "Delete fail");
        return;
      }
      setSelectedIds((s) => {
        const n = new Set(s);
        n.delete(fileId);
        return n;
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onDropFile = async (fileId: string, filePath: string, targetFolderPath: string) => {
    const fileName = filePath.slice(filePath.lastIndexOf("/") + 1);
    const nextPath = joinPath(targetFolderPath, fileName);
    if (nextPath === filePath) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: nextPath })
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setToast(json.error ?? "Move fail");
        return;
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const renderFolder = (node: ExplorerFolderNode, depth: number): ReactNode => {
    const open = expanded.has(node.path);
    const pad = 10 + depth * 12;

    return (
      <div key={`folder-${node.path || "root"}`}>
        <div
          draggable={!node.isVirtual}
          onDragStart={(e) => {
            if (node.isVirtual) return;
            e.dataTransfer.setData(
              "application/x-coder-explorer",
              JSON.stringify({ kind: "folder", folderId: node.id, path: node.path })
            );
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={(e) => {
            e.preventDefault();
            const raw = e.dataTransfer.getData("application/x-coder-explorer");
            if (!raw) return;
            const payload = JSON.parse(raw) as { kind: string; fileId?: string; path?: string; folderId?: string };
            if (payload.kind === "file" && payload.fileId && payload.path) {
              const target = node.path;
              if (parentDir(payload.path) === target || payload.path.startsWith(`${target}/`)) return;
              void onDropFile(payload.fileId, payload.path, target);
            }
          }}
          className="flex w-full items-center gap-1"
        >
          <button
            type="button"
            onClick={() => toggleExpanded(node.path)}
            style={{ paddingLeft: pad }}
            className="flex flex-1 items-center gap-1.5 py-1 text-left text-[12px] text-[#c5c6d2] hover:bg-[#2a2b34]"
            onContextMenu={(ev) => {
              ev.preventDefault();
              setCtx({ x: ev.clientX, y: ev.clientY, target: { kind: "folder", folderNode: node } });
            }}
          >
            <span className={`text-[10px] text-[#838498] ${open ? "rotate-90" : ""}`}>▶</span>
            <span className="text-[13px]">📁</span>
            {renameDraft?.kind === "folder" && renameDraft.id === node.id ? (
              <input
                autoFocus
                value={renameDraft.value}
                onChange={(e) => setRenameDraft({ ...renameDraft, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submitRename();
                  if (e.key === "Escape") setRenameDraft(null);
                }}
                onBlur={() => void submitRename()}
                className="max-w-[140px] rounded border border-[var(--ide-border)] bg-[#202028] px-1 text-[12px]"
              />
            ) : (
              <span className="truncate">{node.name || projectId}</span>
            )}
          </button>
        </div>
        {open &&
          node.children.map((c) =>
            c.kind === "folder" ? renderFolder(c, depth + 1) : renderFile(c as ExplorerFileNode, depth + 1)
          )}
      </div>
    );
  };

  const renderFile = (node: ExplorerFileNode, depth: number): ReactNode => {
    const pad = 10 + depth * 12;
    const selected = selectedIds.has(node.id);
    return (
      <div
        key={`file-${node.id}`}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(
            "application/x-coder-explorer",
            JSON.stringify({ kind: "file", fileId: node.id, path: node.path })
          );
          e.dataTransfer.effectAllowed = "move";
        }}
        className="flex w-full items-center gap-1"
      >
        <button
          type="button"
          onClick={(ev) => {
            if (ev.ctrlKey || ev.metaKey) {
              setSelectedIds((s) => {
                const n = new Set(s);
                if (n.has(node.id)) n.delete(node.id);
                else n.add(node.id);
                return n;
              });
              return;
            }
            setSelectedIds(new Set());
            onOpenFile(node.id, node.path);
          }}
          onDoubleClick={() => {
            setRenameDraft({ kind: "file", id: node.id, value: node.name });
          }}
          style={{ paddingLeft: pad }}
          onContextMenu={(ev) => {
            ev.preventDefault();
            setCtx({ x: ev.clientX, y: ev.clientY, target: { kind: "file", fileNode: node } });
          }}
          className={`flex w-full items-center gap-2 py-1 text-left text-[12px] ${
            node.path === activeFilePath
              ? "bg-[#094771] text-white"
              : selected
                ? "bg-[#2a2b34] text-[#e8e8f0]"
                : "text-[#d0d0dc] hover:bg-[#2a2b34]"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#7fa5ff]" />
          {renameDraft?.kind === "file" && renameDraft.id === node.id ? (
            <input
              autoFocus
              value={renameDraft.value}
              onChange={(e) => setRenameDraft({ ...renameDraft, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitRename();
                if (e.key === "Escape") setRenameDraft(null);
              }}
              onBlur={() => void submitRename()}
              className="max-w-[160px] rounded border border-[var(--ide-border)] bg-[#202028] px-1 text-[12px]"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate">{node.name}</span>
          )}
        </button>
      </div>
    );
  };

  if (loading) {
    return <div className="px-3 py-4 text-[12px] text-[#85869a]">Explorer load ho raha hai…</div>;
  }
  if (error) {
    return <div className="px-3 py-4 text-[12px] text-[#f44747]">{error}</div>;
  }
  if (!tree) {
    return <div className="px-3 py-4 text-[12px] text-[#85869a]">Koi tree data nahi.</div>;
  }

  const ctxFolder = ctx?.target.kind === "folder" ? ctx.target.folderNode : null;
  const ctxFile = ctx?.target.kind === "file" ? ctx.target.fileNode : null;

  return (
    <div ref={rootRef} className="flex min-h-0 flex-1 flex-col">
      {toast && (
        <div className="mx-2 mb-1 rounded border border-[var(--ide-border)] bg-[#202028] px-2 py-1 text-[11px] text-[var(--ide-muted)]">
          {toast}
        </div>
      )}
      {activePanel === "explorer" && selectedIds.size > 0 && (
        <div className="flex items-center justify-between border-b border-[var(--ide-border)] px-2 py-1 text-[11px] text-[#c9c9d3]">
          <span>{selectedIds.size} file(s) selected</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDeleteFiles([...selectedIds])}
            className="rounded bg-[#5a2d2d] px-2 py-0.5 text-[10px] text-white hover:bg-[#702828]"
          >
            Delete all
          </button>
        </div>
      )}
      {activePanel === "explorer" && (
        <div
          className="thin-scroll flex-1 overflow-auto py-1.5"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={(e) => {
            e.preventDefault();
            const raw = e.dataTransfer.getData("application/x-coder-explorer");
            if (!raw) return;
            const payload = JSON.parse(raw) as { kind: string; fileId?: string; path?: string };
            if (payload.kind === "file" && payload.fileId && payload.path) {
              void onDropFile(payload.fileId, payload.path, "");
            }
          }}
          onContextMenu={(ev) => {
            ev.preventDefault();
            setCtx({ x: ev.clientX, y: ev.clientY, target: { kind: "root" } });
          }}
        >
          {tree.children.map((c) =>
            c.kind === "folder" ? renderFolder(c, 0) : renderFile(c as ExplorerFileNode, 0)
          )}
          {tree.children.length === 0 && (
            <div className="px-3 py-6 text-[12px] text-[#85869a]">Project khali hai — context menu se file/folder banayein.</div>
          )}
        </div>
      )}
      {activePanel === "search" && (
        <div className="thin-scroll flex-1 overflow-auto py-1.5">
          {filteredFiles.length === 0 ? (
            <div className="px-3 py-6 text-[12px] text-[#85869a]">
              {explorerQuery.trim() ? "Koi file match nahi." : "Search likho taake files filter hon."}
            </div>
          ) : (
            filteredFiles.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onOpenFile(f.id, f.path)}
                className={`flex w-full flex-col gap-0.5 px-3 py-1.5 text-left text-[12px] hover:bg-[#2a2b34] ${
                  f.path === activeFilePath ? "bg-[#094771] text-white" : "text-[#d0d0dc]"
                }`}
              >
                <span className="truncate font-medium">{f.name}</span>
                <span className="truncate text-[10px] text-[#85869a]">{f.path}</span>
              </button>
            ))
          )}
        </div>
      )}

      {ctx && (
        <div
          data-explorer-ctx
          className="fixed z-[300] min-w-[180px] rounded border border-[var(--ide-border)] bg-[#25252e] py-1 text-[11px] shadow-xl"
          style={{ left: ctx.x, top: ctx.y }}
        >
          {ctx.target.kind === "root" && (
            <>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left hover:bg-[#2a2b34]"
                onClick={() => {
                  setModal({ mode: "newFile", parentPath: "" });
                  setModalName("");
                  setCtx(null);
                }}
              >
                New file
              </button>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left hover:bg-[#2a2b34]"
                onClick={() => {
                  setModal({ mode: "newFolder", parentPath: "" });
                  setModalName("");
                  setCtx(null);
                }}
              >
                New folder
              </button>
            </>
          )}
          {ctxFolder && (
            <>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left hover:bg-[#2a2b34]"
                onClick={() => {
                  setModal({ mode: "newFile", parentPath: ctxFolder.path });
                  setModalName("");
                  setCtx(null);
                }}
              >
                New file
              </button>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left hover:bg-[#2a2b34]"
                onClick={() => {
                  setModal({ mode: "newFolder", parentPath: ctxFolder.path });
                  setModalName("");
                  setCtx(null);
                }}
              >
                New folder
              </button>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left hover:bg-[#2a2b34]"
                onClick={() => {
                  copyPath(ctxFolder.path);
                  setCtx(null);
                }}
              >
                Copy path
              </button>
              {!ctxFolder.isVirtual && (
                <>
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left hover:bg-[#2a2b34]"
                    onClick={() => {
                      setRenameDraft({
                        kind: "folder",
                        id: ctxFolder.id,
                        value: ctxFolder.name
                      });
                      setCtx(null);
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-[#f44747] hover:bg-[#2a2b34]"
                    onClick={() => {
                      void deleteFolder(ctxFolder);
                      setCtx(null);
                    }}
                  >
                    Delete folder
                  </button>
                </>
              )}
            </>
          )}
          {ctxFile && (
            <>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left hover:bg-[#2a2b34]"
                onClick={() => {
                  copyPath(ctxFile.path);
                  setCtx(null);
                }}
              >
                Copy path
              </button>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left hover:bg-[#2a2b34]"
                onClick={() => {
                  setRenameDraft({ kind: "file", id: ctxFile.id, value: ctxFile.name });
                  setCtx(null);
                }}
              >
                Rename
              </button>
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left text-[#f44747] hover:bg-[#2a2b34]"
                onClick={() => {
                  void deleteFile(ctxFile.id);
                  setCtx(null);
                }}
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[280] grid place-items-center bg-black/45 px-3">
          <div className="w-full max-w-sm rounded border border-[var(--ide-border)] bg-[var(--ide-panel)] p-4">
            <p className="text-[13px] font-semibold text-[var(--ide-text)]">
              {modal.mode === "newFile" ? "Nayi file" : "Naya folder"}
            </p>
            <p className="mt-1 text-[11px] text-[var(--ide-muted)]">
              Parent: {modal.parentPath || "(root)"}
            </p>
            <input
              value={modalName}
              onChange={(e) => setModalName(e.target.value)}
              placeholder={modal.mode === "newFile" ? "e.g. utils.ts" : "e.g. hooks"}
              className="mt-3 w-full rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] px-3 py-2 text-[12px] outline-none"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded border border-[var(--ide-border)] px-3 py-1.5 text-[12px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void submitModal()}
                className="rounded bg-[var(--ide-accent)] px-3 py-1.5 text-[12px] text-white disabled:opacity-50"
              >
                {busy ? "…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
