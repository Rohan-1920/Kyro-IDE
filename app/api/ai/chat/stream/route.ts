import { addChatMessage, streamAssistantReply } from "@/lib/server/services/ai-service";
import { getProject } from "@/lib/server/services/project-service";
import { getAuthenticatedUserId } from "@/lib/server/utils/auth";
import { fail, handleRouteError } from "@/lib/server/utils/http";
import { generateId } from "@/lib/server/utils/id";
import { parseJsonBody, requireStringField } from "@/lib/server/utils/validation";

export async function POST(request: Request) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const body = await parseJsonBody<Record<string, unknown>>(request);
    const projectId = requireStringField(body.projectId, "projectId", { minLength: 2 });
    const message = requireStringField(body.message, "message", { minLength: 1 });
    const action = typeof body.action === "string" ? body.action : "general";
    const safeAction = action === "explain" || action === "fix" || action === "optimize" ? action : "general";
    const activeFilePath = typeof body.activeFilePath === "string" ? body.activeFilePath : undefined;
    const selectedCode = typeof body.selectedCode === "string" ? body.selectedCode : undefined;

    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);

    await addChatMessage({ projectId, role: "user", content: message });

    let finalText = "";
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of streamAssistantReply({
          projectId,
          message,
          action: safeAction,
          activeFilePath,
          selectedCode
        })) {
          finalText += chunk;
          controller.enqueue(`data: ${JSON.stringify({ chunk })}\n\n`);
        }
        await addChatMessage({ projectId, role: "assistant", content: finalText.trim() });
        controller.enqueue(`event: done\ndata: ${JSON.stringify({ done: true })}\n\n`);
        controller.close();
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
    return handleRouteError(err, { route: "/api/ai/chat/stream", requestId });
  }
}
