import { login } from "@/lib/server/services/auth-service";
import { setSessionCookie } from "@/lib/server/utils/auth";
import { handleRouteError, ok } from "@/lib/server/utils/http";
import { generateId } from "@/lib/server/utils/id";
import { logger } from "@/lib/server/utils/logger";
import { parseJsonBody, requireStringField } from "@/lib/server/utils/validation";

export async function POST(request: Request) {
  const requestId = generateId("req");
  try {
    const body = await parseJsonBody<Record<string, unknown>>(request);
    const email = requireStringField(body.email, "email", { minLength: 5 }).toLowerCase();
    const password = requireStringField(body.password, "password", { minLength: 8 });

    const user = await login({ email, password });
    await setSessionCookie(user.id);

    logger.info({
      message: "User login successful",
      route: "/api/auth/login",
      requestId,
      data: { userId: user.id, email: user.email }
    });

    return ok(
      { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
      200,
      "LOGIN_SUCCESS",
      requestId
    );
  } catch (err) {
    return handleRouteError(err, { route: "/api/auth/login", requestId });
  }
}
