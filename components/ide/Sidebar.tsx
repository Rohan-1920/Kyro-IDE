"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { fileTree } from "@/lib/ide-data";
import type { SidebarPanel } from "@/lib/types";

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  activeFilePath: string;
  onOpenFile: (path: string) => void;
};

type ActivityItem = { id: SidebarPanel; title: string; icon: "files" | "search" | "git" | "ext" };

const activityItems: ActivityItem[] = [
  { id: "explorer", title: "Explorer", icon: "files" },
  { id: "search", title: "Search", icon: "search" },
  { id: "git", title: "Source Control", icon: "git" },
  { id: "extensions", title: "Extensions", icon: "ext" }
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
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="4" y="4" width="7" height="7" rx="1.2" />
      <rect x="13" y="4" width="7" height="7" rx="1.2" />
      <rect x="4" y="13" width="7" height="7" rx="1.2" />
      <rect x="13" y="13" width="7" height="7" rx="1.2" />
    </svg>
  );
}

export function Sidebar({ collapsed, onToggle, activeFilePath, onOpenFile }: SidebarProps) {
  const [activePanel, setActivePanel] = useState<SidebarPanel>("explorer");
  const [query, setQuery] = useState("");
  const [openFolders, setOpenFolders] = useState<Set<string>>(
    new Set(fileTree.filter((f) => f.type === "folder" && f.open).map((f) => f.name))
  );

  const visibleFiles = useMemo(
    () =>
      fileTree.filter((item) => {
        if (activePanel !== "search") return true;
        if (item.type !== "file") return false;
        if (!query) return true;
        return (
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.path?.toLowerCase().includes(query.toLowerCase())
        );
      }),
    [query, activePanel]
  );

  const selectPanel = (id: SidebarPanel) => {
    if (id === activePanel && !collapsed) {
      onToggle();
      return;
    }
    if (collapsed) onToggle();
    setActivePanel(id);
  };

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
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-r border-[var(--ide-border)] bg-[var(--ide-panel)]"
          >
            <div className="flex h-full w-[280px] flex-col">
              <div className="border-b border-[var(--ide-border)] px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.09em] text-[#a2a3b4]">
                {activePanel === "search" ? "Search" : "Explorer"}
              </div>

              {activePanel === "search" && (
                <div className="border-b border-[var(--ide-border)] p-2.5">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search files..."
                    className="w-full rounded border border-[var(--ide-border)] bg-[#202028] px-2 py-1.5 text-[12px] text-[var(--ide-text)] outline-none placeholder:text-[#77788b]"
                  />
                </div>
              )}

              <div className="thin-scroll flex-1 overflow-auto py-1.5">
                {visibleFiles.map((item) => {
                  const indent = (item.indent ?? 0) * 12;
                  if (item.type === "folder") {
                    const isOpen = openFolders.has(item.name);
                    if (activePanel === "search") return null;
                    return (
                      <button
                        key={`folder-${item.name}-${item.indent}`}
                        onClick={() =>
                          setOpenFolders((prev) => {
                            const next = new Set(prev);
                            if (next.has(item.name)) next.delete(item.name);
                            else next.add(item.name);
                            return next;
                          })
                        }
                        style={{ paddingLeft: 10 + indent }}
                        className="flex w-full items-center gap-1.5 py-1 text-left text-[12px] text-[#c5c6d2] hover:bg-[#2a2b34]"
                      >
                        <span className={`text-[10px] text-[#838498] ${isOpen ? "rotate-90" : ""}`}>▶</span>
                        <span className="text-[13px]">📁</span>
                        <span className="truncate">{item.name}</span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={item.path ?? item.name}
                      onClick={() => item.path && onOpenFile(item.path)}
                      style={{ paddingLeft: 10 + indent }}
                      className={`flex w-full items-center gap-2 py-1 text-left text-[12px] ${
                        item.path === activeFilePath
                          ? "bg-[#094771] text-white"
                          : "text-[#d0d0dc] hover:bg-[#2a2b34]"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-[#7fa5ff]" />
                      <span className="truncate">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
