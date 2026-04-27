import { memoryRepository } from "@/lib/server/db/memory-repository";
import { createPrismaRepository } from "@/lib/server/db/prisma-repository";
import type { BackendRepository } from "@/lib/server/db/repository";

let cachedRepository: BackendRepository | null = null;

export async function getRepository(): Promise<BackendRepository> {
  if (cachedRepository) return cachedRepository;

  const provider = (process.env.DB_PROVIDER ?? "memory").toLowerCase();
  if (provider === "prisma") {
    cachedRepository = await createPrismaRepository();
    return cachedRepository;
  }

  cachedRepository = memoryRepository;
  return cachedRepository;
}
