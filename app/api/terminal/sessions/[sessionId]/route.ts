import {
  deleteTerminalSession,
  getTerminalSession,
  updateTerminalSession
} from "@/lib/server/services/terminal-service";
import { getAuthenticatedUserId } from "@/lib/server/utils/auth";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { generateId } from "@/lib/server/utils/id";
import { parseJsonBody, requireStringField } from "@/lib/server/utils/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const { sessionId } = await params;
    const session = await getTerminalSession(sessionId);
    if (!session) return fail("Terminal session not found.", 404, "TERMINAL_SESSION_NOT_FOUND", undefined, requestId);
    if (session.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);
    const body = await parseJsonBody<Record<string, unknown>>(request);
    const title = requireStringField(body.title, "title", { minLength: 1 }).trim().slice(0, 80);
    const updated = await updateTerminalSession(sessionId, userId, title);
    if (!updated) return fail("Terminal session not found.", 404, "TERMINAL_SESSION_NOT_FOUND", undefined, requestId);
    return ok(updated, 200, "TERMINAL_SESSION_UPDATED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/terminal/sessions/[sessionId]", requestId });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const { sessionId } = await params;
    const session = await getTerminalSession(sessionId);
    if (!session) return fail("Terminal session not found.", 404, "TERMINAL_SESSION_NOT_FOUND", undefined, requestId);
    if (session.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);
    const deleted = await deleteTerminalSession(sessionId, userId);
    if (!deleted) return fail("Terminal session not found.", 404, "TERMINAL_SESSION_NOT_FOUND", undefined, requestId);
    return ok({ deleted: true }, 200, "TERMINAL_SESSION_DELETED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/terminal/sessions/[sessionId]", requestId });
  }
}
