"use client";

import MonacoEditor from "@monaco-editor/react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { learningTips } from "@/lib/ide-data";
import { FileTabs } from "./FileTabs";
import type { CodeFile, TabItem } from "@/lib/types";

type EditorAreaProps = {
  learningMode: boolean;
  onToggleLearningMode: () => void;
  activeFile: CodeFile | null;
  tabs: TabItem[];
  onSelectTab: (path?: string) => void;
  onCloseTab: (path?: string) => void;
  onCursorChange?: (line: number, column: number) => void;
  onChangeContent?: (content: string) => void;
  onSave?: () => void | Promise<void>;
  fileLoading?: boolean;
  saveDisabled?: boolean;
  saving?: boolean;
};

export function EditorArea({
  learningMode,
  onToggleLearningMode,
  activeFile,
  tabs,
  onSelectTab,
  onCloseTab,
  onCursorChange,
  onChangeContent,
  onSave,
  fileLoading,
  saveDisabled,
  saving
}: EditorAreaProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key.toLowerCase() !== "s") return;
      e.preventDefault();
      if (!saveDisabled && onSave) void onSave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveDisabled, onSave]);

  const pathLabel = activeFile?.path ?? "";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--ide-bg)]">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--ide-border)] bg-[var(--ide-panel)] px-3 py-1.5">
        <div className="flex items-center gap-1 text-[11px]">
          <span className="text-[var(--ide-muted)]">workspace</span>
          <span className="text-[var(--ide-muted)]">›</span>
          <span className="truncate text-[var(--ide-text)]">{pathLabel || "—"}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--ide-muted)]">
            <span>Learning</span>
            <button
              onClick={onToggleLearningMode}
              className={`relative h-4 w-8 rounded-full border transition-colors ${
                learningMode
                  ? "border-[var(--ide-accent)] bg-[var(--ide-accent)]"
                  : "border-[var(--ide-border)] bg-[var(--ide-panel-2)]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${
                  learningMode ? "left-4" : "left-0.5"
                }`}
              />
            </button>
          </div>
          <button
            type="button"
            disabled={saveDisabled || saving || !activeFile}
            onClick={() => onSave?.()}
            className="rounded border border-[var(--ide-border)] px-2 py-[3px] text-[11px] text-[var(--ide-text)] hover:bg-[var(--ide-panel-2)] disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button className="rounded bg-[var(--ide-accent)] px-2 py-[3px] text-[11px] text-white hover:bg-[#4668e8]">
            Run
          </button>
        </div>
      </div>

      <FileTabs tabs={tabs} onSelectTab={onSelectTab} onCloseTab={onCloseTab} />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="relative min-w-0 flex-1">
          {!activeFile || fileLoading ? (
            <div className="grid h-full place-items-center text-[12px] text-[var(--ide-muted)]">
              {fileLoading ? "File load ho rahi hai…" : "Koi file select nahi."}
            </div>
          ) : (
            <MonacoEditor
              key={activeFile.fileId ?? activeFile.path}
              language={activeFile.language}
              value={activeFile.content}
              theme="vs-dark"
              onChange={(v) => onChangeContent?.(v ?? "")}
              onMount={(editor) => {
                onCursorChange?.(1, 1);
                editor.onDidChangeCursorPosition((e) => {
                  onCursorChange?.(e.position.lineNumber, e.position.column);
                });
              }}
              options={{
              minimap: { enabled: true },
              fontSize: 13,
              lineHeight: 21,
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              renderLineHighlight: "line",
              glyphMargin: true,
              smoothScrolling: true,
              cursorBlinking: "smooth",
              wordWrap: "on",
              padding: { top: 12, bottom: 12 }
            }}
            />
          )}
        </div>

        <AnimatePresence initial={false}>
          {learningMode && (
            <motion.aside
              key="learning-pane"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 250, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden border-l border-[var(--ide-border)] bg-[var(--ide-panel)]"
            >
              <div className="w-[250px] p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ide-muted)]">
                  Learning Mode
                </p>
                <div className="mb-2 rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] p-2 text-[11px] text-[var(--ide-muted)]">
                  Beginner hints inline rahenge. Complex lines ko simple lafzon me samjha ja raha hai.
                </div>
                {learningTips.map((tip, i) => (
                  <motion.div
                    key={tip}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="mb-2 rounded border border-[var(--ide-border)] bg-[var(--ide-bg)] p-2.5 text-[11px] text-[var(--ide-text)]"
                  >
                    {tip}
                  </motion.div>
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
