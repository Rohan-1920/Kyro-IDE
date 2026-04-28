export type ApiSuccess<T> = {
  success: true;
  code: string;
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
  };
};

export type ApiError = {
  success: false;
  code: string;
  error: string;
  details?: unknown;
  meta?: {
    requestId: string;
    timestamp: string;
  };
};

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
};

export type ProjectRecord = {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectFileRecord = {
  id: string;
  projectId: string;
  path: string;
  name: string;
  language: "typescript" | "javascript" | "css" | "json" | "markdown";
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type FolderRecord = {
  id: string;
  projectId: string;
  parentFolderId: string | null;
  path: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type FileVersionRecord = {
  id: string;
  projectId: string;
  fileId: string;
  content: string;
  source: "manual-save" | "autosave";
  createdAt: string;
};

export type OpenTabsState = {
  id: string;
  projectId: string;
  userId: string;
  filePaths: string[];
  updatedAt: string;
};

export type ChatMessageRecord = {
  id: string;
  projectId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type TerminalExecution = {
  id: string;
  sessionId: string;
  userId: string;
  projectId: string;
  command: string;
  output: string;
  eventType: "input" | "output" | "system";
  sequence: number;
  status: "completed" | "failed";
  executedAt: string;
};

export type TerminalSessionRecord = {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type GitIntegrationRecord = {
  id: string;
  projectId: string;
  userId: string;
  provider: "github";
  accountLogin: string;
  accessTokenMasked: string;
  repoOwner?: string;
  repoName?: string;
  defaultBranch?: string;
  connectedAt: string;
  updatedAt: string;
};

export type GitSyncJobRecord = {
  id: string;
  projectId: string;
  userId: string;
  type: "sync" | "push" | "pull";
  status: "queued" | "running" | "completed" | "failed";
  summary: string;
  createdAt: string;
};

export type ExtensionRegistryRecord = {
  id: string;
  name: string;
  publisher: string;
  version: string;
  description: string;
};

export type ProjectExtensionRecord = {
  id: string;
  projectId: string;
  userId: string;
  extensionId: string;
  enabled: boolean;
  config: Record<string, unknown>;
  installedAt: string;
  updatedAt: string;
};

export type UserSettingRecord = {
  id: string;
  userId: string;
  editor: {
    theme: string;
    fontSize: number;
    tabSize: number;
    autoSave: boolean;
  };
  updatedAt: string;
};

export type WorkspaceSettingRecord = {
  id: string;
  projectId: string;
  userId: string;
  editorOverrides: Partial<UserSettingRecord["editor"]>;
  updatedAt: string;
};

export type AuditLogRecord = {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: unknown;
  createdAt: string;
};
