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
    const query = searchParams.get("q") ?? undefined;
    const actionPrefix = searchParams.get("actionPrefix") ?? undefined;
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    const cursor = searchParams.get("cursor") ?? undefined;
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(200, limit)) : 50;

    const logs = await listAuditLogs(userId, {
      limit: safeLimit,
      query,
      actionPrefix,
      from,
      to,
      cursor
    });
    const nextCursor = logs.length >= safeLimit ? logs[logs.length - 1]?.createdAt : null;
    return ok({ items: logs, nextCursor }, 200, "AUDIT_LOGS_FETCHED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/audit", requestId });
  }
}
