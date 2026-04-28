import {
  addChatMessage,
  generateAssistantReply,
  listChatMessages
} from "@/lib/server/services/ai-service";
import { getProject } from "@/lib/server/services/project-service";
import { getAuthenticatedUserId } from "@/lib/server/utils/auth";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { generateId } from "@/lib/server/utils/id";
import { logger } from "@/lib/server/utils/logger";
import { parseJsonBody, requireStringField } from "@/lib/server/utils/validation";

export async function GET(request: Request) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) return fail("projectId query param is required.", 422, "VALIDATION_ERROR", undefined, requestId);
    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);
    return ok(await listChatMessages(projectId), 200, "CHAT_HISTORY_FETCHED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/ai/chat", requestId });
  }
}

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

    const userMessage = await addChatMessage({
      projectId,
      role: "user",
      content: message
    });

    const aiReply = await addChatMessage({
      projectId,
      role: "assistant",
      content: await generateAssistantReply({
        projectId,
        message,
        action: safeAction,
        activeFilePath,
        selectedCode
      })
    });

    logger.info({
      message: "AI chat exchange created",
      route: "/api/ai/chat",
      requestId,
      data: { projectId }
    });

    return ok({ userMessage, aiReply }, 201, "CHAT_MESSAGE_CREATED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/ai/chat", requestId });
  }
}
