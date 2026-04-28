import {
  getWorkspaceSettings,
  saveWorkspaceSettings
} from "@/lib/server/services/settings-service";
import { getProject } from "@/lib/server/services/project-service";
import { getAuthenticatedUserId } from "@/lib/server/utils/auth";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { checkRateLimit } from "@/lib/server/utils/rate-limit";
import { generateId } from "@/lib/server/utils/id";
import { parseJsonBody } from "@/lib/server/utils/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const { projectId } = await params;
    const rate = checkRateLimit(`settings:workspace:get:${userId}`, 120, 60_000);
    if (!rate.allowed) return fail("Rate limit exceeded.", 429, "RATE_LIMITED", rate, requestId);

    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);

    return ok(await getWorkspaceSettings(projectId, userId), 200, "WORKSPACE_SETTINGS_FETCHED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/settings/workspace/[projectId]", requestId });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const { projectId } = await params;
    const rate = checkRateLimit(`settings:workspace:put:${userId}`, 80, 60_000);
    if (!rate.allowed) return fail("Rate limit exceeded.", 429, "RATE_LIMITED", rate, requestId);

    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const overrides =
      typeof body.editorOverrides === "object" && body.editorOverrides
        ? (body.editorOverrides as Partial<{ theme: string; fontSize: number; tabSize: number; autoSave: boolean }>)
        : {};
    return ok(
      await saveWorkspaceSettings(projectId, userId, overrides),
      200,
      "WORKSPACE_SETTINGS_SAVED",
      requestId
    );
  } catch (err) {
    return handleRouteError(err, { route: "/api/settings/workspace/[projectId]", requestId });
  }
}
