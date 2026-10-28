import { getRedis } from "@repo/queue";

/**
 * Per-(user, org) MCP rate limit (SAY-31) — a fixed one-minute window, keyed by
 * whichever org the tool call targets, never pooled across an org's members.
 * See `getMcpRateLimitPerMinute` in `@repo/edition` for the ceiling by plan.
 */
export interface McpRateLimitResult {
	allowed: boolean;
	/** Only set when `allowed` is false. */
	retryAfterSeconds?: number;
}

export async function checkMcpRateLimit(userId: string, orgId: string, limit: number): Promise<McpRateLimitResult> {
	const redis = getRedis();
	const bucket = Math.floor(Date.now() / 60_000);
	const key = `mcp:ratelimit:${userId}:${orgId}:${bucket}`;

	const count = await redis.incr(key);
	if (count === 1) {
		// First hit in this window — set the expiry once. A couple of seconds of
		// slack beyond the window itself means a slow second request can't find
		// the key gone and silently reset the count.
		await redis.expire(key, 62);
	}

	if (count > limit) {
		const secondsIntoWindow = Math.floor(Date.now() / 1000) % 60;
		return { allowed: false, retryAfterSeconds: 60 - secondsIntoWindow };
	}

	return { allowed: true };
}
