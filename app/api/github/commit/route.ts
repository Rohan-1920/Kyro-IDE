import { queueGithubOperation } from "@/lib/server/services/github-service";
import { getProject } from "@/lib/server/services/project-service";
import { getAuthenticatedUserId } from "@/lib/server/utils/auth";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { checkRateLimit } from "@/lib/server/utils/rate-limit";
import { generateId } from "@/lib/server/utils/id";
import { parseJsonBody, requireStringField } from "@/lib/server/utils/validation";

export async function POST(request: Request) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const rate = checkRateLimit(`github:commit:${userId}`, 30, 60_000);
    if (!rate.allowed) return fail("Rate limit exceeded.", 429, "RATE_LIMITED", rate, requestId);

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const projectId = requireStringField(body.projectId, "projectId", { minLength: 2 });
    const message = requireStringField(body.message, "message", { minLength: 3 });

    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);

    const job = await queueGithubOperation({
      projectId,
      userId,
      type: "push",
      summary: `Commit created: ${message}`
    });
    return ok({ commitId: `mock_${job.id}`, job }, 201, "GITHUB_COMMIT_CREATED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/github/commit", requestId });
  }
}
