import { clearSessionCookie } from "@/lib/server/utils/auth";
import { ok } from "@/lib/server/utils/http";
import { generateId } from "@/lib/server/utils/id";

export async function POST() {
  const requestId = generateId("req");
  await clearSessionCookie();
  return ok({ loggedOut: true }, 200, "LOGOUT_SUCCESS", requestId);
}
