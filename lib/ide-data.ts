import type { ChatMessage, CodeFile, FileTreeItem, TabItem } from "./types";

export const quickActions = ["Explain", "Fix Bug", "Optimize", "Generate Docs"];

export const editorTabs: TabItem[] = [
  { name: "App.tsx",       active: true, ext: "tsx" },
  { name: "ChatPanel.tsx", ext: "tsx" },
  { name: "styles.css",    ext: "css" },
  { name: "utils.ts",      ext: "ts", modified: true },
];

export const fileTree: FileTreeItem[] = [
  { name: "coder-ide",      type: "folder", open: true,  indent: 0 },
  { name: "src",            type: "folder", open: true,  indent: 1 },
  { name: "App.tsx",        path: "src/App.tsx", type: "file", active: true, indent: 2, ext: "tsx" },
  { name: "main.tsx",       path: "src/main.tsx", type: "file", indent: 2, ext: "tsx" },
  { name: "components",     type: "folder", open: true,  indent: 2 },
  { name: "ChatPanel.tsx",  path: "src/components/ChatPanel.tsx", type: "file", indent: 3, ext: "tsx" },
  { name: "Sidebar.tsx",    path: "src/components/Sidebar.tsx", type: "file", indent: 3, ext: "tsx" },
  { name: "EditorArea.tsx", path: "src/components/EditorArea.tsx", type: "file", indent: 3, ext: "tsx" },
  { name: "lib",            type: "folder", open: true, indent: 2 },
  { name: "utils.ts",       path: "src/lib/utils.ts", type: "file", indent: 3, ext: "ts" },
  { name: "types.ts",       path: "src/lib/types.ts", type: "file", indent: 3, ext: "ts" },
  { name: "public",         type: "folder", open: false, indent: 1 },
  { name: "package.json",   path: "package.json", type: "file", indent: 1, ext: "json" },
  { name: "tsconfig.json",  path: "tsconfig.json", type: "file", indent: 1, ext: "json" },
];

export const mockFiles: CodeFile[] = [
  {
    name: "App.tsx",
    path: "src/App.tsx",
    language: "typescript",
    content: `import { ChatPanel } from "./components/ChatPanel";

export default function App() {
  const hasError = true;
  if (hasError) {
    throw new Error("Undefined variable x");
  }

  return <ChatPanel />;
}
`
  },
  {
    name: "ChatPanel.tsx",
    path: "src/components/ChatPanel.tsx",
    language: "typescript",
    content: `type Props = { title?: string };

export function ChatPanel({ title = "AI Assistant" }: Props) {
  return (
    <section className="chat-panel">
      <h2>{title}</h2>
      <p>Ask me to explain or fix your code.</p>
    </section>
  );
}
`
  },
  {
    name: "styles.css",
    path: "src/styles.css",
    language: "css",
    content: `.chat-panel {
  border: 1px solid #32323a;
  border-radius: 10px;
  padding: 12px;
  color: #d7d7e0;
}
`
  },
  {
    name: "utils.ts",
    path: "src/lib/utils.ts",
    language: "typescript",
    modified: true,
    content: `export function formatErrorMessage(name: string) {
  return "Undefined variable: " + name;
}
`
  }
];

export const codeLines = [
  { tokens: [
    { text: "import",    cls: "text-[#c792ea]" },
    { text: " { useState } ", cls: "text-[#e8e8ec]" },
    { text: "from",      cls: "text-[#c792ea]" },
    { text: ' "react"',  cls: "text-[#a5d6a7]" },
    { text: ";",         cls: "text-[#e8e8ec]" },
  ]},
  { tokens: [
    { text: "import",    cls: "text-[#c792ea]" },
    { text: " { ChatPanel } ", cls: "text-[#e8e8ec]" },
    { text: "from",      cls: "text-[#c792ea]" },
    { text: ' "./components/ChatPanel"', cls: "text-[#a5d6a7]" },
    { text: ";",         cls: "text-[#e8e8ec]" },
  ]},
  { tokens: [{ text: "", cls: "" }] },
  { tokens: [
    { text: "// Main app component", cls: "text-[#546e7a] italic" },
  ]},
  { tokens: [
    { text: "export default function", cls: "text-[#c792ea]" },
    { text: " ",         cls: "" },
    { text: "App",       cls: "text-[#82aaff]" },
    { text: "() {",      cls: "text-[#e8e8ec]" },
  ]},
  { tokens: [
    { text: "  const",   cls: "text-[#c792ea]" },
    { text: " hasError", cls: "text-[#f07178]" },
    { text: " = ",       cls: "text-[#e8e8ec]" },
    { text: "true",      cls: "text-[#ff9cac]" },
    { text: ";",         cls: "text-[#e8e8ec]" },
  ], error: true },
  { tokens: [
    { text: "  if",      cls: "text-[#c792ea]" },
    { text: " (hasError) ", cls: "text-[#e8e8ec]" },
    { text: "throw new", cls: "text-[#c792ea]" },
    { text: " Error(",   cls: "text-[#e8e8ec]" },
    { text: '"Undefined variable x"', cls: "text-[#a5d6a7]" },
    { text: ");",        cls: "text-[#e8e8ec]" },
  ], error: true },
  { tokens: [
    { text: "  return",  cls: "text-[#c792ea]" },
    { text: " <",        cls: "text-[#89ddff]" },
    { text: "ChatPanel", cls: "text-[#82aaff]" },
    { text: " />",       cls: "text-[#89ddff]" },
    { text: ";",         cls: "text-[#e8e8ec]" },
  ]},
  { tokens: [{ text: "}", cls: "text-[#e8e8ec]" }] },
];

export const learningTips = [
  "💡 `const` use karo jab value change nahi karni hoti.",
  "📖 `export default function` ek React component define karta hai.",
  "⚠️ Line 6-7 runtime crash create kar rahi hai.",
];

export const initialMessages: ChatMessage[] = [
  {
    type: "ai",
    text: "Namaste! Main **Coder AI** hun. Aapka code analyze karke step-by-step help karunga.\n\nKya aap chahte hain ki main current file ka error fix karun?",
    timestamp: "10:30 AM",
  },
  {
    type: "user",
    text: "Haan, yeh error kyu aa raha hai?",
    timestamp: "10:31 AM",
  },
  {
    type: "ai",
    text: "Aap `x` variable ko define kiye bina use kar rahe ho. Fix:\n```tsx\nconst x = 10;\nconsole.log(x); // ✓ Ab koi error nahi\n```\nLine 6 mein `hasError = true` hai isliye throw ho raha hai.",
    timestamp: "10:31 AM",
  },
];
