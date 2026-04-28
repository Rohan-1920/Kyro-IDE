import { getTerminalSession } from "@/lib/server/services/terminal-service";
import { subscribeTerminalEvents } from "@/lib/server/terminal/stream";
import { getAuthenticatedUserId } from "@/lib/server/utils/auth";
import { fail, handleRouteError } from "@/lib/server/utils/http";
import { generateId } from "@/lib/server/utils/id";

export async function GET(
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

    let unsubscribe: (() => void) | undefined;
    let heartbeat: ReturnType<typeof setInterval> | undefined;

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(`event: ready\ndata: ${JSON.stringify({ sessionId })}\n\n`);
        unsubscribe = subscribeTerminalEvents(sessionId, (event) => {
          controller.enqueue(`event: terminal\ndata: ${JSON.stringify(event)}\n\n`);
        });

        heartbeat = setInterval(() => {
          controller.enqueue(`event: ping\ndata: ${Date.now()}\n\n`);
        }, 15000);
      },
      cancel() {
        if (heartbeat) clearInterval(heartbeat);
        if (unsubscribe) unsubscribe();
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      }
    });
  } catch (err) {
    return handleRouteError(err, { route: "/api/terminal/sessions/[sessionId]/stream", requestId });
  }
}
