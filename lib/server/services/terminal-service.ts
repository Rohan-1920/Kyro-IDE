import { getRepository } from "@/lib/server/db/provider";
import { evaluateTerminalCommand } from "@/lib/server/terminal/policy";
import { publishTerminalEvent } from "@/lib/server/terminal/stream";

export async function listTerminalSessions(projectId: string, userId: string) {
  const repo = await getRepository();
  return repo.listTerminalSessions(projectId, userId);
}

export async function createTerminalSession(projectId: string, userId: string, title?: string) {
  const repo = await getRepository();
  const created = await repo.createTerminalSession(projectId, userId, title);
  await repo.addAuditLog({
    userId,
    action: "terminal.session.created",
    resourceType: "project",
    resourceId: projectId,
    metadata: { sessionId: created.id, title: created.title }
  });
  return created;
}

export async function updateTerminalSession(sessionId: string, userId: string, title: string) {
  const repo = await getRepository();
  const updated = await repo.updateTerminalSession(sessionId, userId, title);
  if (updated) {
    await repo.addAuditLog({
      userId,
      action: "terminal.session.renamed",
      resourceType: "project",
      resourceId: updated.projectId,
      metadata: { sessionId, title: updated.title }
    });
  }
  return updated;
}

export async function deleteTerminalSession(sessionId: string, userId: string) {
  const repo = await getRepository();
  const session = await repo.getTerminalSession(sessionId);
  if (!session || session.userId !== userId) return false;
  const deleted = await repo.deleteTerminalSession(sessionId, userId);
  if (deleted) {
    await repo.addAuditLog({
      userId,
      action: "terminal.session.deleted",
      resourceType: "project",
      resourceId: session.projectId,
      metadata: { sessionId, title: session.title }
    });
  }
  return deleted;
}

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
  const repo = await getRepository();
  const policy = evaluateTerminalCommand(command);
  if (!policy.allowed) {
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
    await repo.addAuditLog({
      userId,
      action: "terminal.command.blocked",
      resourceType: "project",
      resourceId: projectId,
      metadata: { sessionId, command, reason: policy.reason }
    });
    publishTerminalEvent(sessionId, next);
    return next;
  }
  const event = await repo.executeTerminalCommand(sessionId, projectId, userId, command);
  await repo.addAuditLog({
    userId,
    action: "terminal.command.executed",
    resourceType: "project",
    resourceId: projectId,
    metadata: { sessionId, command, status: event.status }
  });
  publishTerminalEvent(sessionId, event);
  return event;
}

export async function listTerminalHistory(
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
  const repo = await getRepository();
  return repo.listTerminalHistory(projectId, userId, options);
}

export async function getTerminalSession(sessionId: string) {
  const repo = await getRepository();
  return repo.getTerminalSession(sessionId);
}
