import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { AuthError } from "@/lib/server/utils/validation";

const SESSION_COOKIE = "kyro_session";
const DEFAULT_SECRET = "kyro_dev_secret_change_me";

function getSecret() {
  return process.env.AUTH_SECRET || DEFAULT_SECRET;
}

function signPayload(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  const [salt, digest] = hash.split(":");
  if (!salt || !digest) return false;
  const computed = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(computed), Buffer.from(digest));
}

export function createSessionToken(userId: string): string {
  const payload = JSON.stringify({ userId, iat: Date.now() });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const signature = signPayload(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function readSessionToken(token: string): { userId: string } | null {
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;
  const expected = signPayload(payloadB64);
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const decoded = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as {
    userId?: string;
  };
  if (!decoded.userId) return null;
  return { userId: decoded.userId };
}

export async function setSessionCookie(userId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getAuthenticatedUserId(): Promise<string> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) throw new AuthError("Authentication required.");
  const payload = readSessionToken(token);
  if (!payload) throw new AuthError("Invalid session.");
  return payload.userId;
}
