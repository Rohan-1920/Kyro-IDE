import type {
  ChatMessageRecord,
  ProjectFileRecord,
  ProjectRecord,
  TerminalExecution
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
  executeTerminalCommand(projectId: string, command: string): Promise<TerminalExecution>;
  listTerminalHistory(projectId: string): Promise<TerminalExecution[]>;
}

export type BackendRepository = ProjectRepository & FileRepository & ChatRepository & TerminalRepository;
