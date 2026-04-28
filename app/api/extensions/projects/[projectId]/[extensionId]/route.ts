import {
  uninstallProjectExtension,
  updateProjectExtension
} from "@/lib/server/services/extensions-service";
import { getProject } from "@/lib/server/services/project-service";
import { getAuthenticatedUserId } from "@/lib/server/utils/auth";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { checkRateLimit } from "@/lib/server/utils/rate-limit";
import { generateId } from "@/lib/server/utils/id";
import { parseJsonBody } from "@/lib/server/utils/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; extensionId: string }> }
) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const { projectId, extensionId } = await params;
    const rate = checkRateLimit(`extensions:update:${userId}`, 100, 60_000);
    if (!rate.allowed) return fail("Rate limit exceeded.", 429, "RATE_LIMITED", rate, requestId);

    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);

    const body = await parseJsonBody<Record<string, unknown>>(request);
    const updated = await updateProjectExtension({
      projectId,
      userId,
      extensionId,
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      config: typeof body.config === "object" && body.config ? (body.config as Record<string, unknown>) : undefined
    });
    if (!updated) return fail("Extension not installed.", 404, "EXTENSION_NOT_FOUND", undefined, requestId);
    return ok(updated, 200, "PROJECT_EXTENSION_UPDATED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/extensions/projects/[projectId]/[extensionId]", requestId });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; extensionId: string }> }
) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const { projectId, extensionId } = await params;
    const rate = checkRateLimit(`extensions:delete:${userId}`, 60, 60_000);
    if (!rate.allowed) return fail("Rate limit exceeded.", 429, "RATE_LIMITED", rate, requestId);

    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);

    const deleted = await uninstallProjectExtension(projectId, userId, extensionId);
    if (!deleted) return fail("Extension not installed.", 404, "EXTENSION_NOT_FOUND", undefined, requestId);
    return ok({ deleted: true }, 200, "PROJECT_EXTENSION_UNINSTALLED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/extensions/projects/[projectId]/[extensionId]", requestId });
  }
}
