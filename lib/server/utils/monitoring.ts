import { logger } from "@/lib/server/utils/logger";

export function captureException(
  err: unknown,
  context: { route: string; requestId?: string; userId?: string }
) {
  logger.error({
    message: err instanceof Error ? err.message : "Unhandled exception",
    route: context.route,
    requestId: context.requestId,
    data: { userId: context.userId }
  });
}
