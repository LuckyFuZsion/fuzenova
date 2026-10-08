import 'server-only'

// Best-effort limiter kept in memory. On serverless hosting each warm instance has its own copy, so this
// slows down abuse rather than stopping it; Resend and Firebase also enforce their own limits.
const hits = new Map<string, number[]>()

/** Returns true if the action is allowed (and records it), false if `key` has already done it `max` times within `windowMs`. */
export function allow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= max) {
    hits.set(key, recent)
    return false
  }
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k)
  return true
}
