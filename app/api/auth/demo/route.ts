import { setSessionCookie } from "@/lib/server/utils/auth";
import { ok } from "@/lib/server/utils/http";
import { generateId } from "@/lib/server/utils/id";

const DEMO_USER_ID = "user_demo_1";

export async function POST() {
  const requestId = generateId("req");
  await setSessionCookie(DEMO_USER_ID);
  return ok({ demo: true, userId: DEMO_USER_ID }, 200, "DEMO_SESSION_READY", requestId);
}
