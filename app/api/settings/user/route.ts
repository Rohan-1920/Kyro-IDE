import { getUserSettings, saveUserSettings } from "@/lib/server/services/settings-service";
import { getAuthenticatedUserId } from "@/lib/server/utils/auth";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { checkRateLimit } from "@/lib/server/utils/rate-limit";
import { generateId } from "@/lib/server/utils/id";
import { parseJsonBody } from "@/lib/server/utils/validation";

export async function GET() {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const rate = checkRateLimit(`settings:user:get:${userId}`, 120, 60_000);
    if (!rate.allowed) return fail("Rate limit exceeded.", 429, "RATE_LIMITED", rate, requestId);
    return ok(await getUserSettings(userId), 200, "USER_SETTINGS_FETCHED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/settings/user", requestId });
  }
}

export async function PUT(request: Request) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const rate = checkRateLimit(`settings:user:put:${userId}`, 80, 60_000);
    if (!rate.allowed) return fail("Rate limit exceeded.", 429, "RATE_LIMITED", rate, requestId);
    const body = await parseJsonBody<Record<string, unknown>>(request);
    const editor =
      typeof body.editor === "object" && body.editor
        ? (body.editor as { theme: string; fontSize: number; tabSize: number; autoSave: boolean })
        : null;
    if (!editor) return fail("editor payload is required.", 422, "VALIDATION_ERROR", undefined, requestId);
    return ok(await saveUserSettings(userId, editor), 200, "USER_SETTINGS_SAVED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/settings/user", requestId });
  }
}
