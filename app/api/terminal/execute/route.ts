import {
  executeTerminalCommand,
  listTerminalHistory
} from "@/lib/server/services/terminal-service";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { generateId } from "@/lib/server/utils/id";
import { logger } from "@/lib/server/utils/logger";
import { parseJsonBody, requireStringField } from "@/lib/server/utils/validation";

export async function GET(request: Request) {
  const requestId = generateId("req");
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) return fail("projectId query param is required.", 422, "VALIDATION_ERROR", undefined, requestId);
    return ok(await listTerminalHistory(projectId), 200, "TERMINAL_HISTORY_FETCHED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/terminal/execute", requestId });
  }
}

export async function POST(request: Request) {
  const requestId = generateId("req");
  try {
    const body = await parseJsonBody<Record<string, unknown>>(request);
    const projectId = requireStringField(body.projectId, "projectId", { minLength: 2 });
    const command = requireStringField(body.command, "command", { minLength: 1 });

    const result = await executeTerminalCommand(projectId, command);
    logger.info({
      message: "Terminal command executed",
      route: "/api/terminal/execute",
      requestId,
      data: { projectId, command }
    });
    return ok(result, 201, "TERMINAL_COMMAND_EXECUTED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/terminal/execute", requestId });
  }
}
