import {
  deleteProject,
  getProject,
  updateProject
} from "@/lib/server/services/project-service";
import { getAuthenticatedUserId } from "@/lib/server/utils/auth";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { generateId } from "@/lib/server/utils/id";
import { logger } from "@/lib/server/utils/logger";
import { optionalStringField, parseJsonBody } from "@/lib/server/utils/validation";

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
    logger.info({
      message: "Project fetched",
      route: "/api/projects/[projectId]",
      requestId,
      data: { projectId }
    });
    return ok(project, 200, "PROJECT_FETCHED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/projects/[projectId]", requestId });
  }
}

export async function PATCH(
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
    const updated = await updateProject(projectId, {
      name: optionalStringField(body.name),
      description: optionalStringField(body.description)
    });
    if (!updated) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    return ok(updated, 200, "PROJECT_UPDATED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/projects/[projectId]", requestId });
  }
}

export async function DELETE(
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
    const deleted = await deleteProject(projectId);
    if (!deleted) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    logger.info({
      message: "Project deleted",
      route: "/api/projects/[projectId]",
      requestId,
      data: { projectId }
    });
    return ok({ deleted: true }, 200, "PROJECT_DELETED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/projects/[projectId]", requestId });
  }
}
