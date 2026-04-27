import { getRepository } from "@/lib/server/db/provider";

export function executeTerminalCommand(projectId: string, command: string) {
  return getRepository().then((repo) => repo.executeTerminalCommand(projectId, command));
}

export function listTerminalHistory(projectId: string) {
  return getRepository().then((repo) => repo.listTerminalHistory(projectId));
}
