import { deleteFolder, updateFolder } from "@/lib/server/services/file-service";
import { getProject } from "@/lib/server/services/project-service";
import { getAuthenticatedUserId } from "@/lib/server/utils/auth";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { generateId } from "@/lib/server/utils/id";
import { optionalStringField, parseJsonBody } from "@/lib/server/utils/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; folderId: string }> }
) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const { projectId, folderId } = await params;
    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);
    const body = await parseJsonBody<Record<string, unknown>>(request);
    const updated = await updateFolder(projectId, folderId, {
      path: optionalStringField(body.path),
      name: optionalStringField(body.name),
      parentFolderId: typeof body.parentFolderId === "string" ? body.parentFolderId : undefined
    });
    if (!updated) return fail("Folder not found.", 404, "FOLDER_NOT_FOUND", undefined, requestId);
    return ok(updated, 200, "FOLDER_UPDATED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/projects/[projectId]/folders/[folderId]", requestId });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; folderId: string }> }
) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const { projectId, folderId } = await params;
    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);
    const deleted = await deleteFolder(projectId, folderId);
    if (!deleted) {
      return fail("Folder cannot be deleted (missing or not empty).", 409, "FOLDER_DELETE_BLOCKED", undefined, requestId);
    }
    return ok({ deleted: true }, 200, "FOLDER_DELETED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/projects/[projectId]/folders/[folderId]", requestId });
  }
}
