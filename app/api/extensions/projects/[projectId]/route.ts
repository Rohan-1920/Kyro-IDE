import {
  installProjectExtension,
  listProjectExtensions
} from "@/lib/server/services/extensions-service";
import { getProject } from "@/lib/server/services/project-service";
import { getAuthenticatedUserId } from "@/lib/server/utils/auth";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { checkRateLimit } from "@/lib/server/utils/rate-limit";
import { generateId } from "@/lib/server/utils/id";
import { parseJsonBody, requireStringField } from "@/lib/server/utils/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const { projectId } = await params;
    const rate = checkRateLimit(`extensions:list:${userId}`, 120, 60_000);
    if (!rate.allowed) return fail("Rate limit exceeded.", 429, "RATE_LIMITED", rate, requestId);

    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);
    return ok(await listProjectExtensions(projectId, userId), 200, "PROJECT_EXTENSIONS_FETCHED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/extensions/projects/[projectId]", requestId });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const { projectId } = await params;
    const rate = checkRateLimit(`extensions:install:${userId}`, 80, 60_000);
    if (!rate.allowed) return fail("Rate limit exceeded.", 429, "RATE_LIMITED", rate, requestId);

    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const extensionId = requireStringField(body.extensionId, "extensionId", { minLength: 2 });
    const config = typeof body.config === "object" && body.config ? body.config : {};

    const extension = await installProjectExtension({
      projectId,
      userId,
      extensionId,
      config: config as Record<string, unknown>
    });
    return ok(extension, 201, "PROJECT_EXTENSION_INSTALLED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/extensions/projects/[projectId]", requestId });
  }
}
