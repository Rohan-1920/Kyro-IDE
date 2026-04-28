import {
  executeTerminalCommand,
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
    if (!projectId) return fail("projectId query param is required.", 422, "VALIDATION_ERROR", undefined, requestId);
    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);
    return ok(await listTerminalHistory(projectId, userId, sessionId), 200, "TERMINAL_HISTORY_FETCHED", requestId);
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
    const command = requireStringField(body.command, "command", { minLength: 1 });
    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);

    const sessionId =
      typeof body.sessionId === "string" && body.sessionId.trim()
        ? body.sessionId
        : (await getOrCreateTerminalSession(projectId, userId)).id;
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
