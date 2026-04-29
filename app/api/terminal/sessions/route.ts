import { getProject } from "@/lib/server/services/project-service";
import {
  createTerminalSession,
  getOrCreateTerminalSession,
  listTerminalSessions
} from "@/lib/server/services/terminal-service";
import { getAuthenticatedUserId } from "@/lib/server/utils/auth";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { generateId } from "@/lib/server/utils/id";
import { parseJsonBody, requireStringField } from "@/lib/server/utils/validation";

export async function GET(request: Request) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) return fail("projectId query param is required.", 422, "VALIDATION_ERROR", undefined, requestId);
    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);
    return ok(await listTerminalSessions(projectId, userId), 200, "TERMINAL_SESSIONS_FETCHED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/terminal/sessions", requestId });
  }
}

export async function POST(request: Request) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const body = await parseJsonBody<Record<string, unknown>>(request);
    const projectId = requireStringField(body.projectId, "projectId", { minLength: 2 });
    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);

    const createNew = body.createNew === true;
    if (createNew) {
      const title = typeof body.title === "string" ? body.title : undefined;
      return ok(await createTerminalSession(projectId, userId, title), 201, "TERMINAL_SESSION_CREATED", requestId);
    }
    return ok(await getOrCreateTerminalSession(projectId, userId), 201, "TERMINAL_SESSION_READY", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/terminal/sessions", requestId });
  }
}
