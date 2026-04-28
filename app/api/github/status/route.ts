import { getGithubStatus } from "@/lib/server/services/github-service";
import { getProject } from "@/lib/server/services/project-service";
import { getAuthenticatedUserId } from "@/lib/server/utils/auth";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { checkRateLimit } from "@/lib/server/utils/rate-limit";
import { generateId } from "@/lib/server/utils/id";

export async function GET(request: Request) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const rate = checkRateLimit(`github:status:${userId}`, 120, 60_000);
    if (!rate.allowed) return fail("Rate limit exceeded.", 429, "RATE_LIMITED", rate, requestId);

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) return fail("projectId is required.", 422, "VALIDATION_ERROR", undefined, requestId);

    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);
    return ok(await getGithubStatus(projectId, userId), 200, "GITHUB_STATUS_FETCHED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/github/status", requestId });
  }
}
