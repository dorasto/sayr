import { db, getOrganizations } from "@repo/database";
import type { McpServer } from "@modelcontextprotocol/server";
import { eq } from "drizzle-orm";
import { type McpUserClaims, toolError, toolJson } from "../context";

/**
 * Account-identity facts, not task-level access — mirrors profile.ts's own
 * documented exception: no scope required beyond a valid connection. Neither
 * tool names an org, so the per-org rate limit doesn't apply either.
 */
export function registerIdentityTools(server: McpServer, claims: McpUserClaims | null) {
	server.registerTool(
		"whoami",
		{
			title: "Who am I",
			description: "The authenticated Sayr user this MCP connection is acting as.",
		},
		async () => {
			if (!claims) return toolError("Unauthorized.");
			const userId = claims.userId;
			const user = await db.query.user.findFirst({ where: (u) => eq(u.id, userId) });
			if (!user) return toolError("No user found for this token.");
			return toolJson({ id: user.id, name: user.name, email: user.email, image: user.image });
		}
	);

	server.registerTool(
		"list_organizations",
		{
			title: "List organizations",
			description:
				"Organizations the authenticated user is a member of. Use a slug from here as the org argument to every other tool.",
		},
		async () => {
			if (!claims) return toolError("Unauthorized.");
			const organizations = await getOrganizations(claims.userId);
			return toolJson(organizations.map((org) => ({ id: org.id, slug: org.slug, name: org.name, plan: org.plan })));
		}
	);
}
