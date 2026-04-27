export type ChatMessage = {
  type: 'user' | 'ai';
  text: string;
  timestamp?: string;
};

export type FileTreeItem = {
  name: string;
  path?: string;
  type: 'file' | 'folder';
  active?: boolean;
  open?: boolean;
  indent?: number;
  ext?: string;
};

export type TabItem = {
  name: string;
  path?: string;
  active?: boolean;
  modified?: boolean;
  ext?: string;
  icon?: string;
};

export type SidebarPanel =
  | 'explorer'
  | 'search'
  | 'git'
  | 'extensions'
  | 'specs'
  | 'hooks'
  | 'settings';

export type TerminalTab = 'terminal' | 'problems' | 'output' | 'debug';

export type CodeFile = {
  name: string;
  path: string;
  language: "typescript" | "javascript" | "css" | "json" | "markdown";
  content: string;
  modified?: boolean;
};
