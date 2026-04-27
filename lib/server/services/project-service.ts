import { getRepository } from "@/lib/server/db/provider";

export async function listProjects(userId: string) {
  const repo = await getRepository();
  return repo.listProjects(userId);
}

export async function createProject(input: {
  userId: string;
  name: string;
  description?: string;
}) {
  const repo = await getRepository();
  return repo.createProject(input);
}

export async function getProject(projectId: string) {
  const repo = await getRepository();
  return repo.getProject(projectId);
}
