import { getRepository } from "@/lib/server/db/provider";

export async function listExtensionRegistry() {
  const repo = await getRepository();
  return repo.listExtensionRegistry();
}

export async function listProjectExtensions(projectId: string, userId: string) {
  const repo = await getRepository();
  return repo.listProjectExtensions(projectId, userId);
}

export async function installProjectExtension(input: {
  projectId: string;
  userId: string;
  extensionId: string;
  config?: Record<string, unknown>;
}) {
  const repo = await getRepository();
  const extension = await repo.installProjectExtension(input);
  await repo.addAuditLog({
    userId: input.userId,
    action: "extension.install",
    resourceType: "extension",
    resourceId: input.extensionId,
    metadata: { projectId: input.projectId }
  });
  return extension;
}

export async function updateProjectExtension(input: {
  projectId: string;
  userId: string;
  extensionId: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}) {
  const repo = await getRepository();
  const updated = await repo.updateProjectExtension(input.projectId, input.userId, input.extensionId, {
    ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
    ...(input.config !== undefined ? { config: input.config } : {})
  });
  return updated;
}

export async function uninstallProjectExtension(projectId: string, userId: string, extensionId: string) {
  const repo = await getRepository();
  const deleted = await repo.uninstallProjectExtension(projectId, userId, extensionId);
  if (deleted) {
    await repo.addAuditLog({
      userId,
      action: "extension.uninstall",
      resourceType: "extension",
      resourceId: extensionId,
      metadata: { projectId }
    });
  }
  return deleted;
}
