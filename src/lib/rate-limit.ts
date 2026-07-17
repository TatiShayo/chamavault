/**
 * Minimal in-process fixed-window rate limiter.
 *
 * Scope & limits: this guards a single server instance against abusive bursts
 * (credential-burning on the AI route, scraping the public chama page, vote
 * spamming). It is intentionally dependency-free. On a multi-instance / edge
 * deployment the counter is per-instance, so treat it as a first line of
 * defence and add a shared store (Upstash/Redis) or the platform WAF for a
 * global guarantee — see REVIEW_FINDINGS.md.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Opportunistic sweep so the map can't grow unbounded under many distinct keys.
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * @param key      caller identity, e.g. `ai:${userId}` or `portal:${ip}`
 * @param limit    max requests allowed per window
 * @param windowMs window length in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return { ok: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
}

/** Best-effort client IP from proxy headers (Vercel / standard reverse proxies). */
export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
