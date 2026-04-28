import { listAuditLogs } from "@/lib/server/services/audit-service";
import { getAuthenticatedUserId } from "@/lib/server/utils/auth";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { checkRateLimit } from "@/lib/server/utils/rate-limit";
import { generateId } from "@/lib/server/utils/id";

export async function GET(request: Request) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const rate = checkRateLimit(`audit:list:${userId}`, 80, 60_000);
    if (!rate.allowed) return fail("Rate limit exceeded.", 429, "RATE_LIMITED", rate, requestId);
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    return ok(await listAuditLogs(userId, Number.isFinite(limit) ? limit : 50), 200, "AUDIT_LOGS_FETCHED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/audit", requestId });
  }
}
