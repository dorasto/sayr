import { db, schema } from "@repo/database";
import { getMcpRateLimitPerMinute } from "@repo/edition";
import { eq } from "drizzle-orm";
import { resolveOrganizationId } from "../../lib/apiRefs";
import { checkMcpRateLimit } from "../../lib/mcp/rateLimit";

/** Verified identity of an MCP connection, derived from its OAuth access token's claims. */
export interface McpUserClaims {
	userId: string;
	scopes: string[];
}

export function claimsFromAuthInfo(
	authInfo: { clientId?: string; extra?: Record<string, unknown>; scopes?: string[] } | undefined
): McpUserClaims | null {
	const userId = authInfo?.extra?.userId;
	if (typeof userId !== "string" || !userId) return null;
	// A token whose subject is the client itself has no user behind it (client_credentials).
	// The provider no longer issues those, but refuse them here too rather than look them up as a user.
	if (userId === authInfo?.clientId) return null;
	return { userId, scopes: authInfo?.scopes ?? [] };
}

/** Resolves the target org and applies the per-(user, org) rate limit. An `error` means "deny — surface this message to the caller". */
export async function resolveAndRateLimitOrg(
	userId: string,
	orgRef: string
): Promise<{ orgId: string; plan: string | null } | { error: string }> {
	const orgId = await resolveOrganizationId(orgRef);
	if (!orgId) return { error: `No organization found for "${orgRef}".` };

	const org = await db.query.organization.findFirst({
		where: eq(schema.organization.id, orgId),
		columns: { plan: true },
	});

	const limit = getMcpRateLimitPerMinute("cloud", org?.plan ?? null);
	const rateLimit = await checkMcpRateLimit(userId, orgId, limit);
	if (!rateLimit.allowed) {
		return {
			error: `Rate limit exceeded for this organization (${limit} requests/min). Try again in ${rateLimit.retryAfterSeconds}s.`,
		};
	}

	return { orgId, plan: org?.plan ?? null };
}

export function toolError(message: string) {
	return { content: [{ type: "text" as const, text: message }], isError: true };
}

export function toolJson(data: unknown) {
	return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

/** Appended to every Markdown parameter's description — see prosekit/resolveMarkdownMentions.ts. */
export const MARKDOWN_MENTIONS_HINT =
	'Task keys ("SAY-12"), "@username" and "!Category name" for this organization\'s tasks, members and categories become mentions.';
