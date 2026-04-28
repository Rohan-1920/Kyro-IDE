import { getProject } from "@/lib/server/services/project-service";
import { getOpenTabs, saveOpenTabs } from "@/lib/server/services/workspace-service";
import { getAuthenticatedUserId } from "@/lib/server/utils/auth";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { generateId } from "@/lib/server/utils/id";
import { parseJsonBody, ValidationError } from "@/lib/server/utils/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const { projectId } = await params;
    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);
    return ok(await getOpenTabs(projectId, userId), 200, "OPEN_TABS_FETCHED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/projects/[projectId]/tabs", requestId });
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
    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);

    const body = await parseJsonBody<Record<string, unknown>>(request);
    if (!Array.isArray(body.filePaths) || !body.filePaths.every((p) => typeof p === "string")) {
      throw new ValidationError("filePaths must be a string array.");
    }

    return ok(
      await saveOpenTabs(projectId, userId, body.filePaths as string[]),
      200,
      "OPEN_TABS_SAVED",
      requestId
    );
  } catch (err) {
    return handleRouteError(err, { route: "/api/projects/[projectId]/tabs", requestId });
  }
}
