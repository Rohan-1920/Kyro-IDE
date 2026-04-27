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
    return true;
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

  async executeTerminalCommand(projectId: string, command: string) {
    const db = getDB();
    let output = `Executed: ${command}\n`;
    let status: "completed" | "failed" = "completed";
    if (command.includes("npm run build")) output += "Build completed successfully (mock).\n";
    else if (command.includes("npm run dev")) output += "Dev server started on http://localhost:3000 (mock).\n";
    else if (command.includes("rm -rf")) {
      status = "failed";
      output += "Blocked unsafe command.\n";
    } else output += "Command finished.\n";

    const run = {
      id: generateId("term"),
      projectId,
      command,
      output,
      status,
      executedAt: now()
    };
    const list = db.terminalRuns.get(projectId) ?? [];
    list.push(run);
    db.terminalRuns.set(projectId, list);
    return run;
  },

  async listTerminalHistory(projectId: string) {
    const db = getDB();
    return db.terminalRuns.get(projectId) ?? [];
  }
};
