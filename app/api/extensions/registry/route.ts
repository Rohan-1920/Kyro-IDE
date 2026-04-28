import { listExtensionRegistry } from "@/lib/server/services/extensions-service";
import { getAuthenticatedUserId } from "@/lib/server/utils/auth";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { checkRateLimit } from "@/lib/server/utils/rate-limit";
import { generateId } from "@/lib/server/utils/id";

export async function GET() {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const rate = checkRateLimit(`extensions:registry:${userId}`, 200, 60_000);
    if (!rate.allowed) return fail("Rate limit exceeded.", 429, "RATE_LIMITED", rate, requestId);
    return ok(await listExtensionRegistry(), 200, "EXTENSION_REGISTRY_FETCHED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/extensions/registry", requestId });
  }
}
