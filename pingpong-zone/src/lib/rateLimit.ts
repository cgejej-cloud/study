type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= max) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count++;
  return { ok: true, retryAfter: 0 };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

const ipStore = new Map<string, { count: number; resetAt: number }>();

export function checkIpRateLimit(
  ip: string,
  opts: { max: number; windowMs: number }
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = ipStore.get(ip);
  if (!entry || entry.resetAt <= now) {
    ipStore.set(ip, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, remaining: opts.max - 1 };
  }
  if (entry.count >= opts.max) {
    return { allowed: false, remaining: 0 };
  }
  entry.count++;
  return { allowed: true, remaining: opts.max - entry.count };
}

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k);
    }
    for (const [k, v] of ipStore) {
      if (v.resetAt <= now) ipStore.delete(k);
    }
  }, 60_000).unref?.();
}
