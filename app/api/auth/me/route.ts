import { getUserById } from "@/lib/server/services/auth-service";
import { getAuthenticatedUserId } from "@/lib/server/utils/auth";
import { fail, handleRouteError, ok } from "@/lib/server/utils/http";
import { generateId } from "@/lib/server/utils/id";

export async function GET() {
  const requestId = generateId("req");
  try {
    const userId = await getAuthenticatedUserId();
    const user = await getUserById(userId);
    if (!user) return fail("User not found.", 404, "USER_NOT_FOUND", undefined, requestId);
    return ok(
      { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
      200,
      "ME_FETCHED",
      requestId
    );
  } catch (err) {
    return handleRouteError(err, { route: "/api/auth/me", requestId });
  }
}
