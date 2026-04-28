import { getRepository } from "@/lib/server/db/provider";

export async function listAuditLogs(userId: string, limit = 50) {
  const repo = await getRepository();
  return repo.listAuditLogs(userId, limit);
}
