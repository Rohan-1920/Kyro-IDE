import { autosaveProjectFile } from "@/lib/server/services/file-service";
import { getProject } from "@/lib/server/services/project-service";
import { getAuthenticatedUserId } from "@/lib/server/utils/auth";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { generateId } from "@/lib/server/utils/id";
import { parseJsonBody, requireStringField } from "@/lib/server/utils/validation";

export async function POST(
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
    const content = requireStringField(body.content, "content");
    const updated = await autosaveProjectFile(projectId, fileId, content);
    if (!updated) return fail("File not found.", 404, "FILE_NOT_FOUND", undefined, requestId);
    return ok(updated, 200, "FILE_AUTOSAVED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/projects/[projectId]/files/[fileId]/autosave", requestId });
  }
}
