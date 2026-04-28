import { listFileVersions } from "@/lib/server/services/file-service";
import { getProject } from "@/lib/server/services/project-service";
import { getAuthenticatedUserId } from "@/lib/server/utils/auth";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { generateId } from "@/lib/server/utils/id";

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
    return ok(await listFileVersions(projectId, fileId), 200, "FILE_VERSIONS_LISTED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/projects/[projectId]/files/[fileId]/versions", requestId });
  }
}
