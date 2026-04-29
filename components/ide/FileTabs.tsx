"use client";

import type { TabItem } from "@/lib/types";

type FileTabsProps = {
  tabs: TabItem[];
  onSelectTab?: (path?: string) => void;
  onCloseTab?: (path?: string) => void;
};

const extColors: Record<string, string> = {
  tsx: "bg-[#61dafb]",
  ts: "bg-[#3178c6]",
  css: "bg-[#e879f9]",
  json: "bg-[#f59e0b]",
  js: "bg-[#f7df1e]",
};

export function FileTabs({ tabs, onSelectTab, onCloseTab }: FileTabsProps) {
  return (
    <div className="flex items-end gap-0 overflow-x-auto border-b border-white/[0.07] bg-[#0e0e10]">
      {tabs.map((tab) => (
        <button
          key={tab.fileId ?? tab.path ?? tab.name}
          onClick={() => onSelectTab?.(tab.path)}
          className={`group relative flex cursor-pointer items-center gap-1.5 border-r border-white/[0.06] px-3.5 py-2 text-[12px] transition-colors ${
            tab.active
              ? "bg-[#1a1a1e] text-white"
              : "text-[#6b6b78] hover:bg-[#161618] hover:text-[#a0a0b0]"
          }`}
        >
          {/* Active indicator */}
          {tab.active && (
            <span className="absolute inset-x-0 top-0 h-[2px] rounded-b-full bg-indigo-500" />
          )}

          {/* Ext dot */}
          {tab.ext && (
            <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${extColors[tab.ext] ?? "bg-muted"}`} />
          )}

          <span>{tab.name}</span>

          {/* Modified dot */}
          {tab.modified && (
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Unsaved" />
          )}

          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCloseTab?.(tab.path);
            }}
            className="ml-0.5 hidden h-3.5 w-3.5 items-center justify-center rounded text-[10px] text-muted opacity-0 transition hover:bg-white/10 hover:text-white group-hover:flex"
            aria-label={`Close ${tab.name}`}
            title={`Close ${tab.name}`}
          >
            ×
          </button>
        </button>
      ))}
    </div>
  );
}
