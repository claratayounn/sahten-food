type Bucket = { timestamps: number[] }
const buckets = new Map<string, Bucket>()

// This fallback is process-local. Configure a distributed provider such as Upstash before multi-instance production traffic.
export async function allowRateLimitedRequest(request: Request, keyPrefix: string, limit: number, windowMs: number) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const key = `${keyPrefix}:${ip}`
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
  if (redisUrl && redisToken) {
    try {
      const response = await fetch(`${redisUrl}/pipeline`, { method: 'POST', headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify([['INCR', key], ['PEXPIRE', key, windowMs]]) })
      const results = await response.json()
      return response.ok && Number(results?.[0]?.result) <= limit
    } catch {
      // Fall back to the local bucket if the optional distributed store is unavailable.
    }
  }
  const now = Date.now()
  const bucket = buckets.get(key) || { timestamps: [] }
  bucket.timestamps = bucket.timestamps.filter((timestamp) => timestamp > now - windowMs)
  if (bucket.timestamps.length >= limit) return false
  bucket.timestamps.push(now)
  buckets.set(key, bucket)
  return true
}
