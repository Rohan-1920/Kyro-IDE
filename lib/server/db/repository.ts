import type {
  AuditLogRecord,
  ChatMessageRecord,
  FileVersionRecord,
  FolderRecord,
  GitIntegrationRecord,
  GitSyncJobRecord,
  OpenTabsState,
  ProjectExtensionRecord,
  ProjectFileRecord,
  ProjectRecord,
  ExtensionRegistryRecord,
  TerminalSessionRecord,
  TerminalExecution,
  UserSettingRecord,
  UserRecord
  ,
  WorkspaceSettingRecord
} from "@/lib/server/types";

export type CreateProjectInput = {
  userId: string;
  name: string;
  description?: string;
};

export type CreateFileInput = {
  projectId: string;
  path: string;
  name: string;
  language: "typescript" | "javascript" | "css" | "json" | "markdown";
  content?: string;
};

export type UpdateFileInput = Partial<{
  content: string;
  path: string;
  name: string;
}>;

export interface ProjectRepository {
  listProjects(userId: string): Promise<ProjectRecord[]>;
  createProject(input: CreateProjectInput): Promise<ProjectRecord>;
  getProject(projectId: string): Promise<ProjectRecord | null>;
  updateProject(
    projectId: string,
    updates: Partial<{ name: string; description?: string }>
  ): Promise<ProjectRecord | null>;
  deleteProject(projectId: string): Promise<boolean>;
}

export interface UserRepository {
  createUser(input: { email: string; name: string; passwordHash: string }): Promise<UserRecord>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(userId: string): Promise<UserRecord | null>;
}

export interface FileRepository {
  listProjectFiles(projectId: string): Promise<ProjectFileRecord[]>;
  getProjectFile(projectId: string, fileId: string): Promise<ProjectFileRecord | null>;
  createProjectFile(input: CreateFileInput): Promise<ProjectFileRecord>;
  updateProjectFile(
    projectId: string,
    fileId: string,
    updates: UpdateFileInput
  ): Promise<ProjectFileRecord | null>;
  deleteProjectFile(projectId: string, fileId: string): Promise<boolean>;
  createFileVersion(input: {
    projectId: string;
    fileId: string;
    content: string;
    source: "manual-save" | "autosave";
  }): Promise<FileVersionRecord>;
  listFileVersions(projectId: string, fileId: string): Promise<FileVersionRecord[]>;
}

export interface FolderRepository {
  listProjectFolders(projectId: string): Promise<FolderRecord[]>;
  createFolder(input: {
    projectId: string;
    parentFolderId: string | null;
    path: string;
    name: string;
  }): Promise<FolderRecord>;
  updateFolder(
    projectId: string,
    folderId: string,
    updates: Partial<{ path: string; name: string; parentFolderId: string | null }>
  ): Promise<FolderRecord | null>;
  deleteFolder(projectId: string, folderId: string): Promise<boolean>;
}

export interface WorkspaceRepository {
  getOpenTabs(projectId: string, userId: string): Promise<OpenTabsState>;
  saveOpenTabs(projectId: string, userId: string, filePaths: string[]): Promise<OpenTabsState>;
}

export interface ChatRepository {
  addChatMessage(input: {
    projectId: string;
    role: "user" | "assistant";
    content: string;
  }): Promise<ChatMessageRecord>;
  listChatMessages(projectId: string): Promise<ChatMessageRecord[]>;
}

export interface TerminalRepository {
  listTerminalSessions(projectId: string, userId: string): Promise<TerminalSessionRecord[]>;
  createTerminalSession(projectId: string, userId: string, title?: string): Promise<TerminalSessionRecord>;
  updateTerminalSession(sessionId: string, userId: string, title: string): Promise<TerminalSessionRecord | null>;
  deleteTerminalSession(sessionId: string, userId: string): Promise<boolean>;
  getOrCreateTerminalSession(projectId: string, userId: string): Promise<TerminalSessionRecord>;
  getTerminalSession(sessionId: string): Promise<TerminalSessionRecord | null>;
  executeTerminalCommand(sessionId: string, projectId: string, userId: string, command: string): Promise<TerminalExecution>;
  listTerminalHistory(
    projectId: string,
    userId: string,
    options?: {
      sessionId?: string;
      status?: "completed" | "failed";
      q?: string;
      limit?: number;
      cursor?: string;
    }
  ): Promise<TerminalExecution[]>;
}

export interface GitRepository {
  connectGithub(input: {
    projectId: string;
    userId: string;
    accountLogin: string;
    token: string;
  }): Promise<GitIntegrationRecord>;
  setGithubRepo(input: {
    projectId: string;
    userId: string;
    owner: string;
    repo: string;
    defaultBranch: string;
  }): Promise<GitIntegrationRecord | null>;
  getGithubIntegration(projectId: string, userId: string): Promise<GitIntegrationRecord | null>;
  queueGitSyncJob(input: {
    projectId: string;
    userId: string;
    type: "sync" | "push" | "pull";
    summary: string;
  }): Promise<GitSyncJobRecord>;
  listGitSyncJobs(projectId: string, userId: string): Promise<GitSyncJobRecord[]>;
}

export interface ExtensionRepository {
  listExtensionRegistry(): Promise<ExtensionRegistryRecord[]>;
  listProjectExtensions(projectId: string, userId: string): Promise<ProjectExtensionRecord[]>;
  installProjectExtension(input: {
    projectId: string;
    userId: string;
    extensionId: string;
    config?: Record<string, unknown>;
  }): Promise<ProjectExtensionRecord>;
  updateProjectExtension(
    projectId: string,
    userId: string,
    extensionId: string,
    updates: Partial<{ enabled: boolean; config: Record<string, unknown> }>
  ): Promise<ProjectExtensionRecord | null>;
  uninstallProjectExtension(projectId: string, userId: string, extensionId: string): Promise<boolean>;
}

export interface SettingsRepository {
  getUserSettings(userId: string): Promise<UserSettingRecord>;
  saveUserSettings(userId: string, editor: UserSettingRecord["editor"]): Promise<UserSettingRecord>;
  getWorkspaceSettings(projectId: string, userId: string): Promise<WorkspaceSettingRecord>;
  saveWorkspaceSettings(
    projectId: string,
    userId: string,
    editorOverrides: WorkspaceSettingRecord["editorOverrides"]
  ): Promise<WorkspaceSettingRecord>;
}

export interface AuditRepository {
  addAuditLog(input: {
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata?: unknown;
  }): Promise<AuditLogRecord>;
  listAuditLogs(
    userId: string,
    options?: {
      limit?: number;
      query?: string;
      actionPrefix?: string;
      from?: string;
      to?: string;
      cursor?: string;
    }
  ): Promise<AuditLogRecord[]>;
}

export type BackendRepository = UserRepository &
  ProjectRepository &
  FileRepository &
  FolderRepository &
  WorkspaceRepository &
  ChatRepository &
  TerminalRepository &
  GitRepository &
  ExtensionRepository &
  SettingsRepository &
  AuditRepository;
