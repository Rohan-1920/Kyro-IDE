import { getRepository } from "@/lib/server/db/provider";
import { buildAIContext, buildSystemPrompt, type AIAction } from "@/lib/server/ai/context";
import { getAIResponse, streamAIResponse } from "@/lib/server/ai/provider";

type ProviderMessage = { role: "system" | "user" | "assistant"; content: string };

export function addChatMessage(input: {
  projectId: string;
  role: "user" | "assistant";
  content: string;
}) {
  return getRepository().then((repo) => repo.addChatMessage(input));
}

export function listChatMessages(projectId: string) {
  return getRepository().then((repo) => repo.listChatMessages(projectId));
}

export async function generateAssistantReply(input: {
  projectId: string;
  message: string;
  action: AIAction;
  activeFilePath?: string;
  selectedCode?: string;
}) {
  const context = await buildAIContext({
    projectId: input.projectId,
    activeFilePath: input.activeFilePath,
    selectedCode: input.selectedCode
  });

  const messages: ProviderMessage[] = [
    { role: "system" as const, content: buildSystemPrompt(input.action) },
    ...context.recentMessages.map<ProviderMessage>((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content
    })),
    {
      role: "user" as const,
      content: `Action: ${input.action}\nProject files: ${JSON.stringify(context.projectFiles)}\nActive file: ${
        context.activeFile ? `${context.activeFile.path} (${context.activeFile.language})` : "none"
      }\nSelected code:\n${context.selectedCode ?? "none"}\n\nUser request:\n${input.message}`
    }
  ];
  return getAIResponse(messages);
}

export async function* streamAssistantReply(input: {
  projectId: string;
  message: string;
  action: AIAction;
  activeFilePath?: string;
  selectedCode?: string;
}) {
  const context = await buildAIContext({
    projectId: input.projectId,
    activeFilePath: input.activeFilePath,
    selectedCode: input.selectedCode
  });
  const messages: ProviderMessage[] = [
    { role: "system" as const, content: buildSystemPrompt(input.action) },
    ...context.recentMessages.map<ProviderMessage>((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content
    })),
    {
      role: "user" as const,
      content: `Action: ${input.action}\nUser request:\n${input.message}`
    }
  ];
  for await (const chunk of streamAIResponse(messages)) {
    yield chunk;
  }
}
