import { getRepository } from "@/lib/server/db/provider";

type CreateFileInput = {
  projectId: string;
  path: string;
  name: string;
  language: "typescript" | "javascript" | "css" | "json" | "markdown";
  content?: string;
};

export function listProjectFiles(projectId: string) {
  return getRepository().then((repo) => repo.listProjectFiles(projectId));
}

export function getProjectFile(projectId: string, fileId: string) {
  return getRepository().then((repo) => repo.getProjectFile(projectId, fileId));
}

export function createProjectFile(input: CreateFileInput) {
  return getRepository().then((repo) => repo.createProjectFile(input));
}

export function updateProjectFile(
  projectId: string,
  fileId: string,
  updates: Partial<{ content: string; path: string; name: string }>
) {
  return getRepository().then((repo) =>
    repo.updateProjectFile(projectId, fileId, updates)
  );
}

export function deleteProjectFile(projectId: string, fileId: string) {
  return getRepository().then((repo) => repo.deleteProjectFile(projectId, fileId));
}
