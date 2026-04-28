import {
  deleteProjectFile,
  getProjectFile,
  updateProjectFile
} from "@/lib/server/services/file-service";
import { getProject } from "@/lib/server/services/project-service";
import { getAuthenticatedUserId } from "@/lib/server/utils/auth";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { generateId } from "@/lib/server/utils/id";
import { logger } from "@/lib/server/utils/logger";
import { optionalStringField, parseJsonBody } from "@/lib/server/utils/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; fileId: string }> }
) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const { projectId, fileId } = await params;
    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);
    const file = await getProjectFile(projectId, fileId);
    if (!file) return fail("File not found.", 404, "FILE_NOT_FOUND", undefined, requestId);
    return ok(file, 200, "FILE_FETCHED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/projects/[projectId]/files/[fileId]", requestId });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; fileId: string }> }
) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const { projectId, fileId } = await params;
    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);
    const body = await parseJsonBody<Record<string, unknown>>(request);

    const updated = await updateProjectFile(projectId, fileId, {
      content: optionalStringField(body.content),
      name: optionalStringField(body.name),
      path: optionalStringField(body.path)
    });

    if (!updated) return fail("File not found.", 404, "FILE_NOT_FOUND", undefined, requestId);

    logger.info({
      message: "File updated",
      route: "/api/projects/[projectId]/files/[fileId]",
      requestId,
      data: { projectId, fileId }
    });

    return ok(updated, 200, "FILE_UPDATED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/projects/[projectId]/files/[fileId]", requestId });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; fileId: string }> }
) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const { projectId, fileId } = await params;
    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);
    const deleted = await deleteProjectFile(projectId, fileId);
    if (!deleted) return fail("File not found.", 404, "FILE_NOT_FOUND", undefined, requestId);

    logger.info({
      message: "File deleted",
      route: "/api/projects/[projectId]/files/[fileId]",
      requestId,
      data: { projectId, fileId }
    });

    return ok({ deleted: true }, 200, "FILE_DELETED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/projects/[projectId]/files/[fileId]", requestId });
  }
}
