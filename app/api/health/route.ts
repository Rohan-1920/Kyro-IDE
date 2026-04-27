import { ok } from "@/lib/server/utils/http";
import { generateId } from "@/lib/server/utils/id";
import { logger } from "@/lib/server/utils/logger";

export async function GET() {
  const requestId = generateId("req");
  logger.info({ message: "Health check called", route: "/api/health", requestId });
  return ok(
    {
      service: "coder-ide-backend",
      status: "healthy",
      timestamp: new Date().toISOString()
    },
    200,
    "HEALTH_OK",
    requestId
  );
}
