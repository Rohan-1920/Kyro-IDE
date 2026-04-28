import { NextResponse } from "next/server";
import type { ApiError, ApiSuccess } from "@/lib/server/types";
import { logger } from "@/lib/server/utils/logger";
import { generateId } from "@/lib/server/utils/id";
import { captureException } from "@/lib/server/utils/monitoring";

function buildMeta(requestId?: string) {
  return {
    requestId: requestId ?? generateId("req"),
    timestamp: new Date().toISOString()
  };
}

export function ok<T>(data: T, status = 200, code = "OK", requestId?: string) {
  return NextResponse.json<ApiSuccess<T>>(
    { success: true, code, data, meta: buildMeta(requestId) },
    { status }
  );
}

export function fail(
  message: string,
  status = 400,
  code = "BAD_REQUEST",
  details?: unknown,
  requestId?: string
) {
  return NextResponse.json<ApiError>(
    { success: false, code, error: message, details, meta: buildMeta(requestId) },
    { status }
  );
}

export function handleRouteError(
  err: unknown,
  options: { route: string; requestId?: string }
) {
  if (err instanceof Error && err.name === "ValidationError") {
    logger.warn({
      message: err.message,
      route: options.route,
      requestId: options.requestId,
      data: (err as { details?: unknown }).details
    });
    return fail(err.message, 422, "VALIDATION_ERROR", (err as { details?: unknown }).details, options.requestId);
  }
  if (err instanceof Error && err.name === "AuthError") {
    logger.warn({
      message: err.message,
      route: options.route,
      requestId: options.requestId
    });
    return fail(err.message, 401, "UNAUTHORIZED", undefined, options.requestId);
  }

  captureException(err, { route: options.route, requestId: options.requestId });
  return fail("Internal server error.", 500, "INTERNAL_ERROR", undefined, options.requestId);
}
