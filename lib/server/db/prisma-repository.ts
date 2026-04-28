import type { BackendRepository } from "@/lib/server/db/repository";

/**
 * Prisma adapter placeholder.
 * Activate after installing `prisma` + `@prisma/client`.
 */
export async function createPrismaRepository(): Promise<BackendRepository> {
  try {
    // Use runtime import so build does not fail when prisma deps are absent.
    const runtimeImport = new Function("m", "return import(m)") as (m: string) => Promise<any>;
    const mod = await runtimeImport("@prisma/client");
    const PrismaClient = mod.PrismaClient as new () => any;
    const prisma = new PrismaClient();

    const repo: BackendRepository = {
      async createUser(input) {
        return prisma.user.create({
          data: {
            email: input.email,
            name: input.name,
            passwordHash: input.passwordHash
          }
        }) as unknown as Awaited<ReturnType<BackendRepository["createUser"]>>;
      },
      async findUserByEmail(email) {
        return prisma.user.findUnique({ where: { email } }) as unknown as Awaited<ReturnType<BackendRepository["findUserByEmail"]>>;
      },
      async findUserById(userId) {
        return prisma.user.findUnique({ where: { id: userId } }) as unknown as Awaited<ReturnType<BackendRepository["findUserById"]>>;
      },
      async listProjects(userId) {
        return prisma.project.findMany({ where: { userId } }) as unknown as Awaited<ReturnType<BackendRepository["listProjects"]>>;
      },
      async createProject(input) {
        return prisma.project.create({
          data: {
            userId: input.userId,
            name: input.name,
            description: input.description
          }
        }) as unknown as Awaited<ReturnType<BackendRepository["createProject"]>>;
      },
      async getProject(projectId) {
        return prisma.project.findUnique({ where: { id: projectId } }) as unknown as Awaited<ReturnType<BackendRepository["getProject"]>>;
      },
      async listProjectFiles(projectId) {
        return prisma.projectFile.findMany({ where: { projectId } }) as unknown as Awaited<ReturnType<BackendRepository["listProjectFiles"]>>;
      },
      async getProjectFile(projectId, fileId) {
        return prisma.projectFile.findFirst({ where: { id: fileId, projectId } }) as unknown as Awaited<ReturnType<BackendRepository["getProjectFile"]>>;
      },
      async createProjectFile(input) {
        return prisma.projectFile.create({ data: input }) as unknown as Awaited<ReturnType<BackendRepository["createProjectFile"]>>;
      },
      async createFileVersion(input) {
        return (prisma as any).fileVersion.create({ data: input }) as Awaited<
          ReturnType<BackendRepository["createFileVersion"]>
        >;
      },
      async listFileVersions(projectId, fileId) {
        return (prisma as any).fileVersion.findMany({
          where: { projectId, fileId },
          orderBy: { createdAt: "desc" }
        }) as Awaited<ReturnType<BackendRepository["listFileVersions"]>>;
      },
      async updateProjectFile(projectId, fileId, updates) {
        const existing = await prisma.projectFile.findFirst({ where: { id: fileId, projectId } });
        if (!existing) return null;
        return prisma.projectFile.update({
          where: { id: fileId },
          data: updates
        }) as unknown as Awaited<ReturnType<BackendRepository["updateProjectFile"]>>;
      },
      async deleteProjectFile(projectId, fileId) {
        const existing = await prisma.projectFile.findFirst({ where: { id: fileId, projectId } });
        if (!existing) return false;
        await prisma.projectFile.delete({ where: { id: fileId } });
        return true;
      },
      async listProjectFolders(projectId) {
        return (prisma as any).folder.findMany({ where: { projectId } }) as Awaited<
          ReturnType<BackendRepository["listProjectFolders"]>
        >;
      },
      async createFolder(input) {
        return (prisma as any).folder.create({ data: input }) as Awaited<
          ReturnType<BackendRepository["createFolder"]>
        >;
      },
      async updateFolder(projectId, folderId, updates) {
        const existing = await (prisma as any).folder.findFirst({ where: { id: folderId, projectId } });
        if (!existing) return null;
        return (prisma as any).folder.update({ where: { id: folderId }, data: updates }) as Awaited<
          ReturnType<BackendRepository["updateFolder"]>
        >;
      },
      async deleteFolder(projectId, folderId) {
        const existing = await (prisma as any).folder.findFirst({ where: { id: folderId, projectId } });
        if (!existing) return false;
        await (prisma as any).folder.delete({ where: { id: folderId } });
        return true;
      },
      async getOpenTabs(projectId, userId) {
        const existing = await (prisma as any).openTabs.findFirst({ where: { projectId, userId } });
        if (existing) return existing;
        return (prisma as any).openTabs.create({
          data: { projectId, userId, filePaths: [] }
        }) as Awaited<ReturnType<BackendRepository["getOpenTabs"]>>;
      },
      async saveOpenTabs(projectId, userId, filePaths) {
        const existing = await (prisma as any).openTabs.findFirst({ where: { projectId, userId } });
        if (!existing) {
          return (prisma as any).openTabs.create({
            data: { projectId, userId, filePaths }
          }) as Awaited<ReturnType<BackendRepository["saveOpenTabs"]>>;
        }
        return (prisma as any).openTabs.update({
          where: { id: existing.id },
          data: { filePaths }
        }) as Awaited<ReturnType<BackendRepository["saveOpenTabs"]>>;
      },
      async addChatMessage(input) {
        return prisma.chatMessage.create({ data: input }) as unknown as Awaited<ReturnType<BackendRepository["addChatMessage"]>>;
      },
      async listChatMessages(projectId) {
        return prisma.chatMessage.findMany({
          where: { projectId },
          orderBy: { createdAt: "asc" }
        }) as unknown as Awaited<ReturnType<BackendRepository["listChatMessages"]>>;
      },
      async getOrCreateTerminalSession(projectId, userId) {
        const existing = await (prisma as any).terminalSession.findFirst({
          where: { projectId, userId }
        });
        if (existing) return existing;
        return (prisma as any).terminalSession.create({
          data: { projectId, userId, title: "Default Terminal" }
        }) as Awaited<ReturnType<BackendRepository["getOrCreateTerminalSession"]>>;
      },
      async getTerminalSession(sessionId) {
        return (prisma as any).terminalSession.findUnique({
          where: { id: sessionId }
        }) as Awaited<ReturnType<BackendRepository["getTerminalSession"]>>;
      },
      async executeTerminalCommand(sessionId, projectId, userId, command) {
        const currentCount = await prisma.terminalExecution.count({
          where: { projectId, userId, sessionId }
        });
        return prisma.terminalExecution.create({
          data: {
            sessionId,
            userId,
            projectId,
            command,
            output: `Executed via prisma adapter: ${command}`,
            eventType: "output",
            sequence: currentCount + 1,
            status: "completed"
          }
        }) as unknown as Awaited<ReturnType<BackendRepository["executeTerminalCommand"]>>;
      },
      async listTerminalHistory(projectId, userId, sessionId) {
        return prisma.terminalExecution.findMany({
          where: { projectId, userId, ...(sessionId ? { sessionId } : {}) },
          orderBy: { sequence: "asc" }
        }) as unknown as Awaited<ReturnType<BackendRepository["listTerminalHistory"]>>;
      },
      async connectGithub(input) {
        const existing = await (prisma as any).gitIntegration.findFirst({
          where: { projectId: input.projectId, userId: input.userId }
        });
        if (!existing) {
          return (prisma as any).gitIntegration.create({
            data: {
              projectId: input.projectId,
              userId: input.userId,
              provider: "github",
              accountLogin: input.accountLogin,
              accessTokenMasked: `${input.token.slice(0, 4)}***`
            }
          }) as Awaited<ReturnType<BackendRepository["connectGithub"]>>;
        }
        return (prisma as any).gitIntegration.update({
          where: { id: existing.id },
          data: {
            accountLogin: input.accountLogin,
            accessTokenMasked: `${input.token.slice(0, 4)}***`
          }
        }) as Awaited<ReturnType<BackendRepository["connectGithub"]>>;
      },
      async setGithubRepo(input) {
        const existing = await (prisma as any).gitIntegration.findFirst({
          where: { projectId: input.projectId, userId: input.userId }
        });
        if (!existing) return null;
        return (prisma as any).gitIntegration.update({
          where: { id: existing.id },
          data: {
            repoOwner: input.owner,
            repoName: input.repo,
            defaultBranch: input.defaultBranch
          }
        }) as Awaited<ReturnType<BackendRepository["setGithubRepo"]>>;
      },
      async getGithubIntegration(projectId, userId) {
        return (prisma as any).gitIntegration.findFirst({
          where: { projectId, userId }
        }) as Awaited<ReturnType<BackendRepository["getGithubIntegration"]>>;
      },
      async queueGitSyncJob(input) {
        return (prisma as any).gitSyncJob.create({
          data: { ...input, status: "completed" }
        }) as Awaited<ReturnType<BackendRepository["queueGitSyncJob"]>>;
      },
      async listGitSyncJobs(projectId, userId) {
        return (prisma as any).gitSyncJob.findMany({
          where: { projectId, userId },
          orderBy: { createdAt: "desc" }
        }) as Awaited<ReturnType<BackendRepository["listGitSyncJobs"]>>;
      },
      async listExtensionRegistry() {
        return (prisma as any).extensionRegistry.findMany({
          orderBy: { name: "asc" }
        }) as Awaited<ReturnType<BackendRepository["listExtensionRegistry"]>>;
      },
      async listProjectExtensions(projectId, userId) {
        return (prisma as any).projectExtension.findMany({
          where: { projectId, userId }
        }) as Awaited<ReturnType<BackendRepository["listProjectExtensions"]>>;
      },
      async installProjectExtension(input) {
        const existing = await (prisma as any).projectExtension.findFirst({
          where: { projectId: input.projectId, userId: input.userId, extensionId: input.extensionId }
        });
        if (existing) {
          return (prisma as any).projectExtension.update({
            where: { id: existing.id },
            data: { enabled: true, config: input.config ?? existing.config }
          }) as Awaited<ReturnType<BackendRepository["installProjectExtension"]>>;
        }
        return (prisma as any).projectExtension.create({
          data: {
            projectId: input.projectId,
            userId: input.userId,
            extensionId: input.extensionId,
            enabled: true,
            config: input.config ?? {}
          }
        }) as Awaited<ReturnType<BackendRepository["installProjectExtension"]>>;
      },
      async updateProjectExtension(projectId, userId, extensionId, updates) {
        const existing = await (prisma as any).projectExtension.findFirst({
          where: { projectId, userId, extensionId }
        });
        if (!existing) return null;
        return (prisma as any).projectExtension.update({
          where: { id: existing.id },
          data: updates
        }) as Awaited<ReturnType<BackendRepository["updateProjectExtension"]>>;
      },
      async uninstallProjectExtension(projectId, userId, extensionId) {
        const existing = await (prisma as any).projectExtension.findFirst({
          where: { projectId, userId, extensionId }
        });
        if (!existing) return false;
        await (prisma as any).projectExtension.delete({ where: { id: existing.id } });
        return true;
      },
      async getUserSettings(userId) {
        const existing = await (prisma as any).userSetting.findFirst({ where: { userId } });
        if (existing) return existing;
        return (prisma as any).userSetting.create({
          data: { userId, editor: { theme: "dark", fontSize: 14, tabSize: 2, autoSave: true } }
        }) as Awaited<ReturnType<BackendRepository["getUserSettings"]>>;
      },
      async saveUserSettings(userId, editor) {
        const existing = await (prisma as any).userSetting.findFirst({ where: { userId } });
        if (!existing) {
          return (prisma as any).userSetting.create({
            data: { userId, editor }
          }) as Awaited<ReturnType<BackendRepository["saveUserSettings"]>>;
        }
        return (prisma as any).userSetting.update({
          where: { id: existing.id },
          data: { editor }
        }) as Awaited<ReturnType<BackendRepository["saveUserSettings"]>>;
      },
      async getWorkspaceSettings(projectId, userId) {
        const existing = await (prisma as any).workspaceSetting.findFirst({
          where: { projectId, userId }
        });
        if (existing) return existing;
        return (prisma as any).workspaceSetting.create({
          data: { projectId, userId, editorOverrides: {} }
        }) as Awaited<ReturnType<BackendRepository["getWorkspaceSettings"]>>;
      },
      async saveWorkspaceSettings(projectId, userId, editorOverrides) {
        const existing = await (prisma as any).workspaceSetting.findFirst({
          where: { projectId, userId }
        });
        if (!existing) {
          return (prisma as any).workspaceSetting.create({
            data: { projectId, userId, editorOverrides }
          }) as Awaited<ReturnType<BackendRepository["saveWorkspaceSettings"]>>;
        }
        return (prisma as any).workspaceSetting.update({
          where: { id: existing.id },
          data: { editorOverrides }
        }) as Awaited<ReturnType<BackendRepository["saveWorkspaceSettings"]>>;
      },
      async addAuditLog(input) {
        return (prisma as any).auditLog.create({
          data: input
        }) as Awaited<ReturnType<BackendRepository["addAuditLog"]>>;
      },
      async listAuditLogs(userId, limit = 50) {
        return (prisma as any).auditLog.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: limit
        }) as Awaited<ReturnType<BackendRepository["listAuditLogs"]>>;
      }
    };

    return repo;
  } catch {
    throw new Error("Prisma adapter unavailable. Install prisma and @prisma/client first.");
  }
}
