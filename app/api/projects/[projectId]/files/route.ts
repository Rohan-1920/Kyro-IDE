import {
  createProjectFile,
  listProjectFiles
} from "@/lib/server/services/file-service";
import { getProject } from "@/lib/server/services/project-service";
import { getAuthenticatedUserId } from "@/lib/server/utils/auth";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { generateId } from "@/lib/server/utils/id";
import { logger } from "@/lib/server/utils/logger";
import { optionalStringField, parseJsonBody, requireStringField, ValidationError } from "@/lib/server/utils/validation";

const allowedLanguages = new Set(["typescript", "javascript", "css", "json", "markdown"]);
type AllowedLanguage = "typescript" | "javascript" | "css" | "json" | "markdown";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const { projectId } = await params;
    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);
    return ok(await listProjectFiles(projectId), 200, "FILES_LISTED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/projects/[projectId]/files", requestId });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const { projectId } = await params;
    const project = await getProject(projectId);
    if (!project) return fail("Project not found.", 404, "PROJECT_NOT_FOUND", undefined, requestId);
    if (project.userId !== userId) return fail("Forbidden.", 403, "FORBIDDEN", undefined, requestId);
    const body = await parseJsonBody<Record<string, unknown>>(request);
    const path = requireStringField(body.path, "path", { minLength: 2 });
    const name = requireStringField(body.name, "name", { minLength: 2 });

    if (typeof body.language !== "string" || !allowedLanguages.has(body.language)) {
      throw new ValidationError("Invalid language.");
    }
    const language = body.language as AllowedLanguage;

    const file = await createProjectFile({
      projectId,
      path,
      name,
      language,
      content: optionalStringField(body.content) ?? ""
    });

    logger.info({
      message: "File created",
      route: "/api/projects/[projectId]/files",
      requestId,
      data: { projectId, fileId: file.id }
    });

    return ok(file, 201, "FILE_CREATED", requestId);
  } catch (err) {
    return handleRouteError(err, { route: "/api/projects/[projectId]/files", requestId });
  }
}
