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
      async addChatMessage(input) {
        return prisma.chatMessage.create({ data: input }) as unknown as Awaited<ReturnType<BackendRepository["addChatMessage"]>>;
      },
      async listChatMessages(projectId) {
        return prisma.chatMessage.findMany({
          where: { projectId },
          orderBy: { createdAt: "asc" }
        }) as unknown as Awaited<ReturnType<BackendRepository["listChatMessages"]>>;
      },
      async executeTerminalCommand(projectId, command) {
        return prisma.terminalExecution.create({
          data: {
            projectId,
            command,
            output: `Executed via prisma adapter: ${command}`,
            status: "completed"
          }
        }) as unknown as Awaited<ReturnType<BackendRepository["executeTerminalCommand"]>>;
      },
      async listTerminalHistory(projectId) {
        return prisma.terminalExecution.findMany({
          where: { projectId },
          orderBy: { executedAt: "desc" }
        }) as unknown as Awaited<ReturnType<BackendRepository["listTerminalHistory"]>>;
      }
    };

    return repo;
  } catch {
    throw new Error("Prisma adapter unavailable. Install prisma and @prisma/client first.");
  }
}
