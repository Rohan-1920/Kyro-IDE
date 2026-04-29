import { getRepository } from "@/lib/server/db/provider";

export async function listAuditLogs(
  userId: string,
  options?: {
    limit?: number;
    query?: string;
    actionPrefix?: string;
    from?: string;
    to?: string;
    cursor?: string;
  }
) {
  const repo = await getRepository();
  return repo.listAuditLogs(userId, options);
}
