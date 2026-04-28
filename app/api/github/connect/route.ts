import { connectGithub } from "@/lib/server/services/github-service";
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
    const rate = checkRateLimit(`github:connect:${userId}`, 20, 60_000);
    if (!rate.allowed) return fail("Rate limit exceeded.", 429, "RATE_LIMITED", rate, requestId);

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const projectId = requireStringField(body.projectId, "projectId", { minLength: 2 });
    const accountLogin = requireStringField(body.accountLogin, "accountLogin", { minLength: 2 });
    const token = requireStringField(body.token, "token", { minLength: 8 });

    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);

    return ok(
      await connectGithub({ projectId, userId, accountLogin, token }),
      200,
      "GITHUB_CONNECTED",
      requestId
    );
  } catch (err) {
    return handleRouteError(err, { route: "/api/github/connect", requestId });
  }
}
