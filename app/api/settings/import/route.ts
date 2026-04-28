import { importAllSettings } from "@/lib/server/services/settings-service";
import { getAuthenticatedUserId } from "@/lib/server/utils/auth";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { checkRateLimit } from "@/lib/server/utils/rate-limit";
import { generateId } from "@/lib/server/utils/id";
import { parseJsonBody, requireStringField } from "@/lib/server/utils/validation";

export async function POST(request: Request) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const rate = checkRateLimit(`settings:import:${userId}`, 20, 60_000);
    if (!rate.allowed) return fail("Rate limit exceeded.", 429, "RATE_LIMITED", rate, requestId);
    const body = await parseJsonBody<Record<string, unknown>>(request);
    const projectId = requireStringField(body.projectId, "projectId", { minLength: 2 });
    return ok(
      await importAllSettings(projectId, userId, {
        userSettings:
          typeof body.userSettings === "object" && body.userSettings
            ? (body.userSettings as { theme: string; fontSize: number; tabSize: number; autoSave: boolean })
            : undefined,
        workspaceOverrides:
          typeof body.workspaceOverrides === "object" && body.workspaceOverrides
            ? (body.workspaceOverrides as Partial<{ theme: string; fontSize: number; tabSize: number; autoSave: boolean }>)
            : undefined
      }),
      200,
      "SETTINGS_IMPORTED",
      requestId
    );
  } catch (err) {
    return handleRouteError(err, { route: "/api/settings/import", requestId });
  }
}
