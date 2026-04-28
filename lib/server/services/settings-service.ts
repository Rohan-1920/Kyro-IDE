import { getRepository } from "@/lib/server/db/provider";

export async function getUserSettings(userId: string) {
  const repo = await getRepository();
  return repo.getUserSettings(userId);
}

export async function saveUserSettings(
  userId: string,
  editor: { theme: string; fontSize: number; tabSize: number; autoSave: boolean }
) {
  const repo = await getRepository();
  const setting = await repo.saveUserSettings(userId, editor);
  await repo.addAuditLog({
    userId,
    action: "settings.user.update",
    resourceType: "user",
    resourceId: userId
  });
  return setting;
}

export async function getWorkspaceSettings(projectId: string, userId: string) {
  const repo = await getRepository();
  return repo.getWorkspaceSettings(projectId, userId);
}

export async function saveWorkspaceSettings(
  projectId: string,
  userId: string,
  editorOverrides: Partial<{ theme: string; fontSize: number; tabSize: number; autoSave: boolean }>
) {
  const repo = await getRepository();
  const setting = await repo.saveWorkspaceSettings(projectId, userId, editorOverrides);
  await repo.addAuditLog({
    userId,
    action: "settings.workspace.update",
    resourceType: "project",
    resourceId: projectId
  });
  return setting;
}

export async function exportAllSettings(projectId: string, userId: string) {
  const repo = await getRepository();
  const [userSettings, workspaceSettings] = await Promise.all([
    repo.getUserSettings(userId),
    repo.getWorkspaceSettings(projectId, userId)
  ]);
  return { userSettings, workspaceSettings, exportedAt: new Date().toISOString() };
}

export async function importAllSettings(
  projectId: string,
  userId: string,
  payload: {
    userSettings?: { theme: string; fontSize: number; tabSize: number; autoSave: boolean };
    workspaceOverrides?: Partial<{ theme: string; fontSize: number; tabSize: number; autoSave: boolean }>;
  }
) {
  const repo = await getRepository();
  if (payload.userSettings) await repo.saveUserSettings(userId, payload.userSettings);
  if (payload.workspaceOverrides) {
    await repo.saveWorkspaceSettings(projectId, userId, payload.workspaceOverrides);
  }
  await repo.addAuditLog({
    userId,
    action: "settings.import",
    resourceType: "project",
    resourceId: projectId
  });
  return exportAllSettings(projectId, userId);
}
