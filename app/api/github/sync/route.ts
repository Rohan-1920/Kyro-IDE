import { queueGithubOperation } from "@/lib/server/services/github-service";
import { getProject } from "@/lib/server/services/project-service";
import { getAuthenticatedUserId } from "@/lib/server/utils/auth";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { checkRateLimit } from "@/lib/server/utils/rate-limit";
import { generateId } from "@/lib/server/utils/id";
import { parseJsonBody } from "@/lib/server/utils/validation";

export async function POST(request: Request) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const rate = checkRateLimit(`github:sync:${userId}`, 30, 60_000);
    if (!rate.allowed) return fail("Rate limit exceeded.", 429, "RATE_LIMITED", rate, requestId);

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const projectId = typeof body.projectId === "string" ? body.projectId : "";
    const operation = body.operation === "push" || body.operation === "pull" ? body.operation : "sync";
    if (!projectId) return fail("projectId is required.", 422, "VALIDATION_ERROR", undefined, requestId);

    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);

    const job = await queueGithubOperation({
      projectId,
      userId,
      type: operation,
      summary: `${operation.toUpperCase()} completed (mock job).`
    });
    return ok(job, 201, "GITHUB_SYNC_QUEUED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/github/sync", requestId });
  }
}
