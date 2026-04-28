import { generateId } from "@/lib/server/utils/id";

type Bucket = { count: number; resetAt: number };

declare global {
  // eslint-disable-next-line no-var
  var __rateLimitStore: Map<string, Bucket> | undefined;
}

function getStore() {
  if (!globalThis.__rateLimitStore) globalThis.__rateLimitStore = new Map<string, Bucket>();
  return globalThis.__rateLimitStore;
}

export function checkRateLimit(key: string, max = 60, windowMs = 60_000) {
  const store = getStore();
  const now = Date.now();
  const bucket = store.get(key);
  if (!bucket || bucket.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, requestId: generateId("rl") };
  }
  if (bucket.count >= max) return { allowed: false, retryAfterMs: bucket.resetAt - now };
  bucket.count += 1;
  store.set(key, bucket);
  return { allowed: true, requestId: generateId("rl") };
}
