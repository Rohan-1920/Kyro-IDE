import { getRepository } from "@/lib/server/db/provider";

export async function connectGithub(input: {
  projectId: string;
  userId: string;
  accountLogin: string;
  token: string;
}) {
  const repo = await getRepository();
  const integration = await repo.connectGithub(input);
  await repo.addAuditLog({
    userId: input.userId,
    action: "github.connect",
    resourceType: "project",
    resourceId: input.projectId,
    metadata: { accountLogin: input.accountLogin }
  });
  return integration;
}

export async function setGithubRepo(input: {
  projectId: string;
  userId: string;
  owner: string;
  repo: string;
  defaultBranch: string;
}) {
  const repository = await getRepository();
  const integration = await repository.setGithubRepo(input);
  if (!integration) return null;
  await repository.addAuditLog({
    userId: input.userId,
    action: "github.repo.link",
    resourceType: "project",
    resourceId: input.projectId,
    metadata: { owner: input.owner, repo: input.repo }
  });
  return integration;
}

export async function getGithubStatus(projectId: string, userId: string) {
  const repo = await getRepository();
  const integration = await repo.getGithubIntegration(projectId, userId);
  const jobs = await repo.listGitSyncJobs(projectId, userId);
  return {
    integration,
    jobs,
    branch: integration?.defaultBranch ?? "main",
    dirty: false,
    ahead: 0,
    behind: 0
  };
}

export async function queueGithubOperation(input: {
  projectId: string;
  userId: string;
  type: "sync" | "push" | "pull";
  summary: string;
}) {
  const repo = await getRepository();
  const job = await repo.queueGitSyncJob(input);
  await repo.addAuditLog({
    userId: input.userId,
    action: `github.${input.type}`,
    resourceType: "project",
    resourceId: input.projectId,
    metadata: { summary: input.summary }
  });
  return job;
}
