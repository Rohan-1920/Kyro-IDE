import { getRepository } from "@/lib/server/db/provider";
import { evaluateTerminalCommand } from "@/lib/server/terminal/policy";
import { publishTerminalEvent } from "@/lib/server/terminal/stream";

export async function getOrCreateTerminalSession(projectId: string, userId: string) {
  const repo = await getRepository();
  return repo.getOrCreateTerminalSession(projectId, userId);
}

export async function executeTerminalCommand(
  projectId: string,
  userId: string,
  sessionId: string,
  command: string
) {
  const policy = evaluateTerminalCommand(command);
  if (!policy.allowed) {
    const repo = await getRepository();
    const blocked = await repo.executeTerminalCommand(
      sessionId,
      projectId,
      userId,
      `${command} # blocked`
    );
    const next = {
      ...blocked,
      output: `${blocked.output}\n${policy.reason}\n`,
      status: "failed" as const
    };
    publishTerminalEvent(sessionId, next);
    return next;
  }
  const repo = await getRepository();
  const event = await repo.executeTerminalCommand(sessionId, projectId, userId, command);
  publishTerminalEvent(sessionId, event);
  return event;
}

export async function listTerminalHistory(projectId: string, userId: string, sessionId?: string) {
  const repo = await getRepository();
  return repo.listTerminalHistory(projectId, userId, sessionId);
}

export async function getTerminalSession(sessionId: string) {
  const repo = await getRepository();
  return repo.getTerminalSession(sessionId);
}
