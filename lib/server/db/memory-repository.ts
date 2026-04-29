import { getDB } from "@/lib/server/db/memory";
import type {
  BackendRepository,
  CreateFileInput,
  CreateProjectInput,
  UpdateFileInput
} from "@/lib/server/db/repository";
import { generateId } from "@/lib/server/utils/id";

const now = () => new Date().toISOString();

export const memoryRepository: BackendRepository = {
  async createUser(input) {
    const db = getDB();
    const user = {
      id: generateId("user"),
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      passwordHash: input.passwordHash,
      createdAt: now()
    };
    db.users.set(user.id, user);
    return user;
  },

  async findUserByEmail(email: string) {
    const db = getDB();
    const normalized = email.trim().toLowerCase();
    return [...db.users.values()].find((u) => u.email === normalized) ?? null;
  },

  async findUserById(userId: string) {
    const db = getDB();
    return db.users.get(userId) ?? null;
  },

  async listProjects(userId: string) {
    const db = getDB();
    return [...db.projects.values()].filter((p) => p.userId === userId);
  },

  async createProject(input: CreateProjectInput) {
    const db = getDB();
    const createdAt = now();
    const project = {
      id: generateId("proj"),
      userId: input.userId,
      name: input.name.trim(),
      description: input.description?.trim(),
      createdAt,
      updatedAt: createdAt
    };
    db.projects.set(project.id, project);
    return project;
  },

  async getProject(projectId: string) {
    const db = getDB();
    return db.projects.get(projectId) ?? null;
  },

  async updateProject(projectId: string, updates) {
    const db = getDB();
    const current = db.projects.get(projectId);
    if (!current) return null;
    const next = {
      ...current,
      ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
      ...(updates.description !== undefined ? { description: updates.description?.trim() } : {}),
      updatedAt: now()
    };
    db.projects.set(projectId, next);
    return next;
  },

  async deleteProject(projectId: string) {
    const db = getDB();
    const exists = db.projects.has(projectId);
    if (!exists) return false;
    db.projects.delete(projectId);
    for (const [fileId, file] of [...db.files.entries()]) {
      if (file.projectId === projectId) {
        db.files.delete(fileId);
        db.fileVersions.delete(fileId);
      }
    }
    for (const [folderId, folder] of [...db.folders.entries()]) {
      if (folder.projectId === projectId) db.folders.delete(folderId);
    }
    db.chats.delete(projectId);
    db.terminalRuns.delete(projectId);
    return true;
  },

  async listProjectFiles(projectId: string) {
    const db = getDB();
    return [...db.files.values()].filter((f) => f.projectId === projectId);
  },

  async getProjectFile(projectId: string, fileId: string) {
    const db = getDB();
    const file = db.files.get(fileId);
    if (!file || file.projectId !== projectId) return null;
    return file;
  },

  async createProjectFile(input: CreateFileInput) {
    const db = getDB();
    const createdAt = now();
    const file = {
      id: generateId("file"),
      projectId: input.projectId,
      path: input.path.trim(),
      name: input.name.trim(),
      language: input.language,
      content: input.content ?? "",
      createdAt,
      updatedAt: createdAt
    };
    db.files.set(file.id, file);
    return file;
  },

  async createFileVersion(input) {
    const db = getDB();
    const version = {
      id: generateId("ver"),
      projectId: input.projectId,
      fileId: input.fileId,
      content: input.content,
      source: input.source,
      createdAt: now()
    };
    const list = db.fileVersions.get(input.fileId) ?? [];
    list.push(version);
    db.fileVersions.set(input.fileId, list);
    return version;
  },

  async listFileVersions(projectId: string, fileId: string) {
    const db = getDB();
    return (db.fileVersions.get(fileId) ?? []).filter((v) => v.projectId === projectId);
  },

  async updateProjectFile(projectId: string, fileId: string, updates: UpdateFileInput) {
    const db = getDB();
    const current = db.files.get(fileId);
    if (!current || current.projectId !== projectId) return null;
    const next = {
      ...current,
      ...(updates.content !== undefined ? { content: updates.content } : {}),
      ...(updates.path !== undefined ? { path: updates.path.trim() } : {}),
      ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
      updatedAt: now()
    };
    db.files.set(fileId, next);
    return next;
  },

  async deleteProjectFile(projectId: string, fileId: string) {
    const db = getDB();
    const current = db.files.get(fileId);
    if (!current || current.projectId !== projectId) return false;
    db.files.delete(fileId);
    db.fileVersions.delete(fileId);
    return true;
  },

  async listProjectFolders(projectId: string) {
    const db = getDB();
    return [...db.folders.values()].filter((f) => f.projectId === projectId);
  },

  async createFolder(input) {
    const db = getDB();
    const createdAt = now();
    const folder = {
      id: generateId("folder"),
      projectId: input.projectId,
      parentFolderId: input.parentFolderId ?? null,
      path: input.path.trim(),
      name: input.name.trim(),
      createdAt,
      updatedAt: createdAt
    };
    db.folders.set(folder.id, folder);
    return folder;
  },

  async updateFolder(projectId: string, folderId: string, updates) {
    const db = getDB();
    const current = db.folders.get(folderId);
    if (!current || current.projectId !== projectId) return null;
    const next = {
      ...current,
      ...(updates.path !== undefined ? { path: updates.path.trim() } : {}),
      ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
      ...(updates.parentFolderId !== undefined ? { parentFolderId: updates.parentFolderId } : {}),
      updatedAt: now()
    };
    db.folders.set(folderId, next);
    return next;
  },

  async deleteFolder(projectId: string, folderId: string) {
    const db = getDB();
    const current = db.folders.get(folderId);
    if (!current || current.projectId !== projectId) return false;
    const hasChildFolder = [...db.folders.values()].some(
      (folder) => folder.projectId === projectId && folder.parentFolderId === folderId
    );
    if (hasChildFolder) return false;
    const hasFiles = [...db.files.values()].some(
      (file) => file.projectId === projectId && file.path.startsWith(`${current.path}/`)
    );
    if (hasFiles) return false;
    db.folders.delete(folderId);
    return true;
  },

  async getOpenTabs(projectId: string, userId: string) {
    const db = getDB();
    const key = `${projectId}:${userId}`;
    const existing = db.openTabs.get(key);
    if (existing) return existing;
    const created = {
      id: generateId("tabs"),
      projectId,
      userId,
      filePaths: [],
      updatedAt: now()
    };
    db.openTabs.set(key, created);
    return created;
  },

  async saveOpenTabs(projectId: string, userId: string, filePaths: string[]) {
    const db = getDB();
    const key = `${projectId}:${userId}`;
    const next = {
      id: db.openTabs.get(key)?.id ?? generateId("tabs"),
      projectId,
      userId,
      filePaths,
      updatedAt: now()
    };
    db.openTabs.set(key, next);
    return next;
  },

  async addChatMessage(input: {
    projectId: string;
    role: "user" | "assistant";
    content: string;
  }) {
    const db = getDB();
    const message = {
      id: generateId("chat"),
      projectId: input.projectId,
      role: input.role,
      content: input.content,
      createdAt: now()
    };
    const list = db.chats.get(input.projectId) ?? [];
    list.push(message);
    db.chats.set(input.projectId, list);
    return message;
  },

  async listChatMessages(projectId: string) {
    const db = getDB();
    return db.chats.get(projectId) ?? [];
  },

  async listTerminalSessions(projectId: string, userId: string) {
    const db = getDB();
    return [...db.terminalSessions.values()]
      .filter((session) => session.projectId === projectId && session.userId === userId)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  },

  async createTerminalSession(projectId: string, userId: string, title?: string) {
    const db = getDB();
    const createdAt = now();
    const session = {
      id: generateId("tsess"),
      projectId,
      userId,
      title: title?.trim() ? title.trim() : "Terminal",
      createdAt,
      updatedAt: createdAt
    };
    db.terminalSessions.set(session.id, session);
    return session;
  },

  async updateTerminalSession(sessionId: string, userId: string, title: string) {
    const db = getDB();
    const session = db.terminalSessions.get(sessionId);
    if (!session || session.userId !== userId) return null;
    const next = { ...session, title: title.trim(), updatedAt: now() };
    db.terminalSessions.set(sessionId, next);
    return next;
  },

  async deleteTerminalSession(sessionId: string, userId: string) {
    const db = getDB();
    const session = db.terminalSessions.get(sessionId);
    if (!session || session.userId !== userId) return false;
    db.terminalSessions.delete(sessionId);
    const runs = db.terminalRuns.get(session.projectId) ?? [];
    db.terminalRuns.set(
      session.projectId,
      runs.filter((run) => run.sessionId !== sessionId)
    );
    return true;
  },

  async getOrCreateTerminalSession(projectId: string, userId: string) {
    const db = getDB();
    const existing = [...db.terminalSessions.values()].find(
      (session) => session.projectId === projectId && session.userId === userId
    );
    if (existing) return existing;
    const createdAt = now();
    const session = {
      id: generateId("tsess"),
      projectId,
      userId,
      title: "Default Terminal",
      createdAt,
      updatedAt: createdAt
    };
    db.terminalSessions.set(session.id, session);
    return session;
  },

  async getTerminalSession(sessionId: string) {
    const db = getDB();
    return db.terminalSessions.get(sessionId) ?? null;
  },

  async executeTerminalCommand(sessionId: string, projectId: string, userId: string, command: string) {
    const db = getDB();
    let output = `Executed: ${command}\n`;
    let status: "completed" | "failed" = "completed";
    if (command.includes("npm run build")) output += "Build completed successfully (mock).\n";
    else if (command.includes("npm run dev")) output += "Dev server started on http://localhost:3000 (mock).\n";
    else if (command.includes("rm -rf")) {
      status = "failed";
      output += "Blocked unsafe command.\n";
    } else output += "Command finished.\n";

    const list = db.terminalRuns.get(projectId) ?? [];
    const nextSequence =
      list.filter((item) => item.sessionId === sessionId && item.userId === userId).length + 1;
    const run = {
      id: generateId("term"),
      sessionId,
      userId,
      projectId,
      command,
      output,
      eventType: "output" as const,
      sequence: nextSequence,
      status,
      executedAt: now()
    };
    list.push(run);
    db.terminalRuns.set(projectId, list);
    const session = db.terminalSessions.get(sessionId);
    if (session) {
      db.terminalSessions.set(sessionId, { ...session, updatedAt: now() });
    }
    return run;
  },

  async listTerminalHistory(
    projectId: string,
    userId: string,
    options?: {
      sessionId?: string;
      status?: "completed" | "failed";
      q?: string;
      limit?: number;
      cursor?: string;
    }
  ) {
    const db = getDB();
    const sessionId = options?.sessionId;
    const status = options?.status;
    const q = options?.q?.trim().toLowerCase();
    const limit = options?.limit ?? 60;
    const cursorMs = options?.cursor ? Date.parse(options.cursor) : NaN;
    return (db.terminalRuns.get(projectId) ?? [])
      .filter((run) => {
        if (run.userId !== userId) return false;
        if (sessionId && run.sessionId !== sessionId) return false;
        if (status && run.status !== status) return false;
        if (Number.isFinite(cursorMs) && Date.parse(run.executedAt) >= cursorMs) return false;
        if (!q) return true;
        return run.command.toLowerCase().includes(q) || run.output.toLowerCase().includes(q);
      })
      .sort((a, b) => b.sequence - a.sequence)
      .slice(0, limit)
      .sort((a, b) => a.sequence - b.sequence);
  },

  async connectGithub(input) {
    const db = getDB();
    const key = `${input.projectId}:${input.userId}`;
    const existing = db.gitIntegrations.get(key);
    const nowAt = now();
    const next = {
      id: existing?.id ?? generateId("git"),
      projectId: input.projectId,
      userId: input.userId,
      provider: "github" as const,
      accountLogin: input.accountLogin,
      accessTokenMasked: `${input.token.slice(0, 4)}***`,
      repoOwner: existing?.repoOwner,
      repoName: existing?.repoName,
      defaultBranch: existing?.defaultBranch,
      connectedAt: existing?.connectedAt ?? nowAt,
      updatedAt: nowAt
    };
    db.gitIntegrations.set(key, next);
    return next;
  },

  async setGithubRepo(input) {
    const db = getDB();
    const key = `${input.projectId}:${input.userId}`;
    const existing = db.gitIntegrations.get(key);
    if (!existing) return null;
    const next = {
      ...existing,
      repoOwner: input.owner,
      repoName: input.repo,
      defaultBranch: input.defaultBranch,
      updatedAt: now()
    };
    db.gitIntegrations.set(key, next);
    return next;
  },

  async getGithubIntegration(projectId: string, userId: string) {
    const db = getDB();
    return db.gitIntegrations.get(`${projectId}:${userId}`) ?? null;
  },

  async queueGitSyncJob(input) {
    const db = getDB();
    const job = {
      id: generateId("gjob"),
      projectId: input.projectId,
      userId: input.userId,
      type: input.type,
      status: "completed" as const,
      summary: input.summary,
      createdAt: now()
    };
    const list = db.gitSyncJobs.get(`${input.projectId}:${input.userId}`) ?? [];
    list.unshift(job);
    db.gitSyncJobs.set(`${input.projectId}:${input.userId}`, list);
    return job;
  },

  async listGitSyncJobs(projectId: string, userId: string) {
    const db = getDB();
    return db.gitSyncJobs.get(`${projectId}:${userId}`) ?? [];
  },

  async listExtensionRegistry() {
    const db = getDB();
    return [...db.extensionRegistry.values()];
  },

  async listProjectExtensions(projectId: string, userId: string) {
    const db = getDB();
    return [...db.projectExtensions.values()].filter(
      (ext) => ext.projectId === projectId && ext.userId === userId
    );
  },

  async installProjectExtension(input) {
    const db = getDB();
    const nowAt = now();
    const key = `${input.projectId}:${input.userId}:${input.extensionId}`;
    const existing = db.projectExtensions.get(key);
    const next = {
      id: existing?.id ?? generateId("pext"),
      projectId: input.projectId,
      userId: input.userId,
      extensionId: input.extensionId,
      enabled: true,
      config: input.config ?? {},
      installedAt: existing?.installedAt ?? nowAt,
      updatedAt: nowAt
    };
    db.projectExtensions.set(key, next);
    return next;
  },

  async updateProjectExtension(projectId: string, userId: string, extensionId: string, updates) {
    const db = getDB();
    const key = `${projectId}:${userId}:${extensionId}`;
    const existing = db.projectExtensions.get(key);
    if (!existing) return null;
    const next = {
      ...existing,
      ...(updates.enabled !== undefined ? { enabled: updates.enabled } : {}),
      ...(updates.config !== undefined ? { config: updates.config } : {}),
      updatedAt: now()
    };
    db.projectExtensions.set(key, next);
    return next;
  },

  async uninstallProjectExtension(projectId: string, userId: string, extensionId: string) {
    const db = getDB();
    return db.projectExtensions.delete(`${projectId}:${userId}:${extensionId}`);
  },

  async getUserSettings(userId: string) {
    const db = getDB();
    const existing = db.userSettings.get(userId);
    if (existing) return existing;
    const created = {
      id: generateId("uset"),
      userId,
      editor: {
        theme: "dark",
        fontSize: 14,
        tabSize: 2,
        autoSave: true
      },
      updatedAt: now()
    };
    db.userSettings.set(userId, created);
    return created;
  },

  async saveUserSettings(userId: string, editor) {
    const db = getDB();
    const existing = await this.getUserSettings(userId);
    const next = { ...existing, editor, updatedAt: now() };
    db.userSettings.set(userId, next);
    return next;
  },

  async getWorkspaceSettings(projectId: string, userId: string) {
    const db = getDB();
    const key = `${projectId}:${userId}`;
    const existing = db.workspaceSettings.get(key);
    if (existing) return existing;
    const created = {
      id: generateId("wset"),
      projectId,
      userId,
      editorOverrides: {},
      updatedAt: now()
    };
    db.workspaceSettings.set(key, created);
    return created;
  },

  async saveWorkspaceSettings(projectId: string, userId: string, editorOverrides) {
    const db = getDB();
    const key = `${projectId}:${userId}`;
    const existing = await this.getWorkspaceSettings(projectId, userId);
    const next = { ...existing, editorOverrides, updatedAt: now() };
    db.workspaceSettings.set(key, next);
    return next;
  },

  async addAuditLog(input) {
    const db = getDB();
    const log = {
      id: generateId("audit"),
      userId: input.userId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: input.metadata,
      createdAt: now()
    };
    const list = db.auditLogs.get(input.userId) ?? [];
    list.unshift(log);
    db.auditLogs.set(input.userId, list);
    return log;
  },

  async listAuditLogs(
    userId: string,
    options?: {
      limit?: number;
      query?: string;
      actionPrefix?: string;
      from?: string;
      to?: string;
      cursor?: string;
    }
  ) {
    const db = getDB();
    const limit = options?.limit ?? 50;
    const query = options?.query?.trim().toLowerCase();
    const actionPrefix = options?.actionPrefix?.trim();
    const fromMs = options?.from ? Date.parse(options.from) : NaN;
    const toMs = options?.to ? Date.parse(options.to) : NaN;
    const cursorMs = options?.cursor ? Date.parse(options.cursor) : NaN;

    return (db.auditLogs.get(userId) ?? [])
      .filter((log) => {
        if (actionPrefix && !log.action.startsWith(actionPrefix)) return false;
        if (Number.isFinite(fromMs) && Date.parse(log.createdAt) < fromMs) return false;
        if (Number.isFinite(toMs) && Date.parse(log.createdAt) > toMs) return false;
        if (Number.isFinite(cursorMs) && Date.parse(log.createdAt) >= cursorMs) return false;
        if (!query) return true;
        return (
          log.action.toLowerCase().includes(query) ||
          log.resourceType.toLowerCase().includes(query) ||
          log.resourceId.toLowerCase().includes(query)
        );
      })
      .slice(0, limit);
  }
};
