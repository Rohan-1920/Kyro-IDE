import { createFolder } from "@/lib/server/services/file-service";
import { getProject } from "@/lib/server/services/project-service";
import { getAuthenticatedUserId } from "@/lib/server/utils/auth";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { generateId } from "@/lib/server/utils/id";
import { parseJsonBody, requireStringField } from "@/lib/server/utils/validation";

export async function POST(
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
    const path = requireStringField(body.path, "path", { minLength: 1 });
    const name = requireStringField(body.name, "name", { minLength: 1 });
    const parentFolderId = typeof body.parentFolderId === "string" ? body.parentFolderId : null;

    const folder = await createFolder({ projectId, path, name, parentFolderId });
    return ok(folder, 201, "FOLDER_CREATED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/projects/[projectId]/folders", requestId });
  }
}
