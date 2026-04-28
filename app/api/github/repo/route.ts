import { setGithubRepo } from "@/lib/server/services/github-service";
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
    const rate = checkRateLimit(`github:repo:${userId}`, 40, 60_000);
    if (!rate.allowed) return fail("Rate limit exceeded.", 429, "RATE_LIMITED", rate, requestId);

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const projectId = requireStringField(body.projectId, "projectId", { minLength: 2 });
    const owner = requireStringField(body.owner, "owner", { minLength: 1 });
    const repo = requireStringField(body.repo, "repo", { minLength: 1 });
    const defaultBranch = requireStringField(body.defaultBranch, "defaultBranch", { minLength: 1 });

    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);

    const linked = await setGithubRepo({ projectId, userId, owner, repo, defaultBranch });
    if (!linked) return fail("Connect GitHub first.", 409, "GITHUB_NOT_CONNECTED", undefined, requestId);
    return ok(linked, 200, "GITHUB_REPO_LINKED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/github/repo", requestId });
  }
}
