import { mockFiles } from "@/lib/ide-data";
import type {
  ChatMessageRecord,
  ProjectFileRecord,
  ProjectRecord,
  TerminalExecution,
  UserRecord
} from "@/lib/server/types";

type InMemoryDB = {
  users: Map<string, UserRecord>;
  projects: Map<string, ProjectRecord>;
  files: Map<string, ProjectFileRecord>;
  chats: Map<string, ChatMessageRecord[]>;
  terminalRuns: Map<string, TerminalExecution[]>;
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

  return {
    users,
    projects,
    files,
    chats: new Map<string, ChatMessageRecord[]>(),
    terminalRuns: new Map<string, TerminalExecution[]>()
  };
}

export function getDB(): InMemoryDB {
  if (!globalThis.__coderInMemoryDB) {
    globalThis.__coderInMemoryDB = buildSeedDB();
  }
  return globalThis.__coderInMemoryDB;
}
