import { getRepository } from "@/lib/server/db/provider";

export function getOpenTabs(projectId: string, userId: string) {
  return getRepository().then((repo) => repo.getOpenTabs(projectId, userId));
}

export function saveOpenTabs(projectId: string, userId: string, filePaths: string[]) {
  return getRepository().then((repo) => repo.saveOpenTabs(projectId, userId, filePaths));
}
