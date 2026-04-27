import { getRepository } from "@/lib/server/db/provider";

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

export function generateMockAssistantReply(message: string) {
  const trimmed = message.trim().toLowerCase();
  if (trimmed.includes("error")) {
    return "Issue likely variable scope ya undefined reference ka hai. Pehle symbol define karke rerun karo.";
  }
  if (trimmed.includes("optimize")) {
    return "Optimization tip: repeated loops avoid karo, pure functions use karo, aur expensive operations memoize karo.";
  }
  return "Samajh gaya. Main is code ko step-by-step explain karke best fix suggest kar sakta hoon.";
}
