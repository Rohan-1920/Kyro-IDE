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
  return getRepository().then(async (repo) => {
    const updated = await repo.updateProjectFile(projectId, fileId, updates);
    if (updated && updates.content !== undefined) {
      await repo.createFileVersion({
        projectId,
        fileId,
        content: updates.content,
        source: "manual-save"
      });
    }
    return updated;
  });
}

export function deleteProjectFile(projectId: string, fileId: string) {
  return getRepository().then((repo) => repo.deleteProjectFile(projectId, fileId));
}

export function listProjectFolders(projectId: string) {
  return getRepository().then((repo) => repo.listProjectFolders(projectId));
}

export function createFolder(input: {
  projectId: string;
  parentFolderId: string | null;
  path: string;
  name: string;
}) {
  return getRepository().then((repo) => repo.createFolder(input));
}

export function updateFolder(
  projectId: string,
  folderId: string,
  updates: Partial<{ path: string; name: string; parentFolderId: string | null }>
) {
  return getRepository().then((repo) => repo.updateFolder(projectId, folderId, updates));
}

export function deleteFolder(projectId: string, folderId: string) {
  return getRepository().then((repo) => repo.deleteFolder(projectId, folderId));
}

export async function autosaveProjectFile(projectId: string, fileId: string, content: string) {
  const repo = await getRepository();
  const updated = await repo.updateProjectFile(projectId, fileId, { content });
  if (!updated) return null;
  await repo.createFileVersion({ projectId, fileId, content, source: "autosave" });
  return updated;
}

export function listFileVersions(projectId: string, fileId: string) {
  return getRepository().then((repo) => repo.listFileVersions(projectId, fileId));
}

export async function getProjectTree(projectId: string) {
  const repo = await getRepository();
  const [folders, files] = await Promise.all([
    repo.listProjectFolders(projectId),
    repo.listProjectFiles(projectId)
  ]);
  return { folders, files };
}
