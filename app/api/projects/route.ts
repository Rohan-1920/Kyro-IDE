import { createProject, listProjects } from "@/lib/server/services/project-service";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { generateId } from "@/lib/server/utils/id";
import { logger } from "@/lib/server/utils/logger";
import { optionalStringField, parseJsonBody, requireStringField } from "@/lib/server/utils/validation";

const DEMO_USER_ID = "user_demo_1";

export async function GET() {
  const requestId = generateId("req");
  try {
    logger.info({ message: "List projects", route: "/api/projects", requestId });
    return ok(await listProjects(DEMO_USER_ID), 200, "PROJECTS_LISTED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/projects", requestId });
  }
}

export async function POST(request: Request) {
  const requestId = generateId("req");
  try {
    const body = await parseJsonBody<Record<string, unknown>>(request);
    const name = requireStringField(body.name, "name", { minLength: 2 });
    const description = optionalStringField(body.description);

    const project = await createProject({
      userId: DEMO_USER_ID,
      name,
      description
    });

    logger.info({ message: "Project created", route: "/api/projects", requestId, data: { projectId: project.id } });
    return ok(project, 201, "PROJECT_CREATED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/projects", requestId });
  }
}
