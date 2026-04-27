import {
  addChatMessage,
  generateMockAssistantReply,
  listChatMessages
} from "@/lib/server/services/ai-service";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { generateId } from "@/lib/server/utils/id";
import { logger } from "@/lib/server/utils/logger";
import { parseJsonBody, requireStringField } from "@/lib/server/utils/validation";

export async function GET(request: Request) {
  const requestId = generateId("req");
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) return fail("projectId query param is required.", 422, "VALIDATION_ERROR", undefined, requestId);
    return ok(await listChatMessages(projectId), 200, "CHAT_HISTORY_FETCHED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/ai/chat", requestId });
  }
}

export async function POST(request: Request) {
  const requestId = generateId("req");
  try {
    const body = await parseJsonBody<Record<string, unknown>>(request);
    const projectId = requireStringField(body.projectId, "projectId", { minLength: 2 });
    const message = requireStringField(body.message, "message", { minLength: 1 });

    const userMessage = await addChatMessage({
      projectId,
      role: "user",
      content: message
    });

    const aiReply = await addChatMessage({
      projectId,
      role: "assistant",
      content: generateMockAssistantReply(message)
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
