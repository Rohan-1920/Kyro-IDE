import {
  executeTerminalCommand,
  getTerminalSession,
  getOrCreateTerminalSession,
  listTerminalHistory
} from "@/lib/server/services/terminal-service";
import { getProject } from "@/lib/server/services/project-service";
import { getAuthenticatedUserId } from "@/lib/server/utils/auth";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { generateId } from "@/lib/server/utils/id";
import { logger } from "@/lib/server/utils/logger";
import { parseJsonBody, requireStringField } from "@/lib/server/utils/validation";

export async function GET(request: Request) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const sessionId = searchParams.get("sessionId") ?? undefined;
    const statusRaw = searchParams.get("status");
    const status = statusRaw === "completed" || statusRaw === "failed" ? statusRaw : undefined;
    const q = searchParams.get("q") ?? undefined;
    const cursor = searchParams.get("cursor") ?? undefined;
    const limitRaw = Number(searchParams.get("limit") ?? "60");
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 60;
    if (!projectId) return fail("projectId query param is required.", 422, "VALIDATION_ERROR", undefined, requestId);
    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);
    const items = await listTerminalHistory(projectId, userId, { sessionId, status, q, cursor, limit });
    const nextCursor = items.length >= limit ? items[items.length - 1]?.executedAt : null;
    return ok({ items, nextCursor }, 200, "TERMINAL_HISTORY_FETCHED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/terminal/execute", requestId });
  }
}

export async function POST(request: Request) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const body = await parseJsonBody<Record<string, unknown>>(request);
    const projectId = requireStringField(body.projectId, "projectId", { minLength: 2 });
    const command = requireStringField(body.command, "command", { minLength: 1 }).trim();
    if (command.length > 800) {
      return fail("Command is too long.", 422, "VALIDATION_ERROR", { field: "command", maxLength: 800 }, requestId);
    }
    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);

    let sessionId: string;
    if (typeof body.sessionId === "string" && body.sessionId.trim()) {
      sessionId = body.sessionId.trim();
      const session = await getTerminalSession(sessionId);
      if (!session) return fail("Terminal session not found.", 404, "TERMINAL_SESSION_NOT_FOUND", undefined, requestId);
      if (session.userId !== userId || session.projectId !== projectId) {
        return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);
      }
    } else {
      sessionId = (await getOrCreateTerminalSession(projectId, userId)).id;
    }
    const result = await executeTerminalCommand(projectId, userId, sessionId, command);
    logger.info({
      message: "Terminal command executed",
      route: "/api/terminal/execute",
      requestId,
      data: { projectId, sessionId, command }
    });
    return ok(result, 201, "TERMINAL_COMMAND_EXECUTED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/terminal/execute", requestId });
  }
}
