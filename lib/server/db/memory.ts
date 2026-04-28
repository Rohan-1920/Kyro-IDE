import { mockFiles } from "@/lib/ide-data";
import type {
  AuditLogRecord,
  ChatMessageRecord,
  ExtensionRegistryRecord,
  FileVersionRecord,
  FolderRecord,
  GitIntegrationRecord,
  GitSyncJobRecord,
  OpenTabsState,
  ProjectExtensionRecord,
  ProjectFileRecord,
  ProjectRecord,
  TerminalSessionRecord,
  TerminalExecution,
  UserSettingRecord,
  UserRecord
  ,
  WorkspaceSettingRecord
} from "@/lib/server/types";

type InMemoryDB = {
  users: Map<string, UserRecord>;
  projects: Map<string, ProjectRecord>;
  files: Map<string, ProjectFileRecord>;
  folders: Map<string, FolderRecord>;
  fileVersions: Map<string, FileVersionRecord[]>;
  openTabs: Map<string, OpenTabsState>;
  terminalSessions: Map<string, TerminalSessionRecord>;
  chats: Map<string, ChatMessageRecord[]>;
  terminalRuns: Map<string, TerminalExecution[]>;
  gitIntegrations: Map<string, GitIntegrationRecord>;
  gitSyncJobs: Map<string, GitSyncJobRecord[]>;
  extensionRegistry: Map<string, ExtensionRegistryRecord>;
  projectExtensions: Map<string, ProjectExtensionRecord>;
  userSettings: Map<string, UserSettingRecord>;
  workspaceSettings: Map<string, WorkspaceSettingRecord>;
  auditLogs: Map<string, AuditLogRecord[]>;
};

declare global {
  // eslint-disable-next-line no-var
  var __coderInMemoryDB: InMemoryDB | undefined;
}

const now = () => new Date().toISOString();

function buildSeedDB(): InMemoryDB {
  const userId = "user_demo_1";
  const projectId = "proj_demo_1";

  const users = new Map<string, UserRecord>([
    [
      userId,
      {
        id: userId,
        email: "demo@coder.dev",
        name: "Demo User",
        passwordHash: "seed_password_hash",
        createdAt: now()
      }
    ]
  ]);

  const projects = new Map<string, ProjectRecord>([
    [
      projectId,
      {
        id: projectId,
        userId,
        name: "Coder IDE Demo",
        description: "Seed project for IDE backend structure",
        createdAt: now(),
        updatedAt: now()
      }
    ]
  ]);

  const files = new Map<string, ProjectFileRecord>();
  mockFiles.forEach((f, index) => {
    const id = `file_${index + 1}`;
    files.set(id, {
      id,
      projectId,
      path: f.path,
      name: f.name,
      language: f.language,
      content: f.content,
      createdAt: now(),
      updatedAt: now()
    });
  });

  const folders = new Map<string, FolderRecord>([
    [
      "folder_root_src",
      {
        id: "folder_root_src",
        projectId,
        parentFolderId: null,
        path: "src",
        name: "src",
        createdAt: now(),
        updatedAt: now()
      }
    ]
  ]);

  return {
    users,
    projects,
    files,
    folders,
    fileVersions: new Map<string, FileVersionRecord[]>(),
    openTabs: new Map<string, OpenTabsState>(),
    terminalSessions: new Map<string, TerminalSessionRecord>(),
    chats: new Map<string, ChatMessageRecord[]>(),
    terminalRuns: new Map<string, TerminalExecution[]>(),
    gitIntegrations: new Map<string, GitIntegrationRecord>(),
    gitSyncJobs: new Map<string, GitSyncJobRecord[]>(),
    extensionRegistry: new Map<string, ExtensionRegistryRecord>([
      [
        "ext_prettier",
        {
          id: "ext_prettier",
          name: "Prettier Formatter",
          publisher: "coder",
          version: "1.0.0",
          description: "Format code with consistent style."
        }
      ],
      [
        "ext_eslint",
        {
          id: "ext_eslint",
          name: "ESLint",
          publisher: "coder",
          version: "1.0.0",
          description: "Lint JavaScript and TypeScript projects."
        }
      ]
    ]),
    projectExtensions: new Map<string, ProjectExtensionRecord>(),
    userSettings: new Map<string, UserSettingRecord>(),
    workspaceSettings: new Map<string, WorkspaceSettingRecord>(),
    auditLogs: new Map<string, AuditLogRecord[]>()
  };
}

export function getDB(): InMemoryDB {
  if (!globalThis.__coderInMemoryDB) {
    globalThis.__coderInMemoryDB = buildSeedDB();
  }
  return globalThis.__coderInMemoryDB;
}
