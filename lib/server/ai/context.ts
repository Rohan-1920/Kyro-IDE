import { getRepository } from "@/lib/server/db/provider";

export type AIAction = "explain" | "fix" | "optimize" | "general";

export type AIContextInput = {
  projectId: string;
  activeFilePath?: string;
  selectedCode?: string;
};

export async function buildAIContext(input: AIContextInput) {
  const repo = await getRepository();
  const [files, history] = await Promise.all([
    repo.listProjectFiles(input.projectId),
    repo.listChatMessages(input.projectId)
  ]);

  const activeFile = input.activeFilePath
    ? files.find((f) => f.path === input.activeFilePath)
    : undefined;

  return {
    activeFile: activeFile
      ? {
          path: activeFile.path,
          language: activeFile.language,
          content: activeFile.content.slice(0, 4000)
        }
      : null,
    selectedCode: input.selectedCode?.slice(0, 2000) ?? null,
    recentMessages: history.slice(-8).map((m) => ({
      role: m.role,
      content: m.content
    })),
    projectFiles: files.slice(0, 30).map((f) => ({
      path: f.path,
      language: f.language
    }))
  };
}

export function buildSystemPrompt(action: AIAction) {
  const base =
    "You are Coder AI integrated inside an IDE. Give concise, practical coding help with clear steps and code when needed.";
  if (action === "explain") {
    return `${base} Explain code in beginner-friendly style, short bullets, and mention why it works.`;
  }
  if (action === "fix") {
    return `${base} Prioritize debugging, root cause, and corrected code. Mention exact fix steps.`;
  }
  if (action === "optimize") {
    return `${base} Focus on performance/readability tradeoffs and provide optimized code safely.`;
  }
  return base;
}
