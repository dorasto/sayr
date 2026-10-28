import { db, getLabels, getOrCreateLabel } from "@repo/database";
import type { McpServer } from "@modelcontextprotocol/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { assertMcpAccess } from "../../../lib/mcp/auth";
import { type McpUserClaims, resolveAndRateLimitOrg, toolError, toolJson } from "../context";

/**
 * Reference data an agent needs to resolve names to the ids the mutating task
 * tools take (labels for set_task_labels, members for set_task_assignees,
 * categories for update_task). Every read here gates on tasks.read — the same
 * "is a member of this org" bar the matching /v1/me routes use.
 */
export function registerReferenceTools(server: McpServer, claims: McpUserClaims | null) {
	server.registerTool(
		"list_labels",
		{
			title: "List labels",
			description: "List an organization's labels (public and private), with their ids for set_task_labels.",
			inputSchema: z.object({
				org: z.string().describe('Organization slug (e.g. "platform") or id.'),
			}),
		},
		async ({ org }) => {
			if (!claims) return toolError("Unauthorized.");

			const resolved = await resolveAndRateLimitOrg(claims.userId, org);
			if ("error" in resolved) return toolError(resolved.error);
			const { orgId } = resolved;

			const allowed = await assertMcpAccess(claims.userId, orgId, claims.scopes, "tasks.read");
			if (!allowed) {
				return toolError(
					"You don't have permission to read labels here — the token is missing the tasks.read scope, or your role in this organization doesn't allow it."
				);
			}

			const labels = await getLabels(orgId);
			return toolJson(
				labels.map((label) => ({ id: label.id, name: label.name, color: label.color, visible: label.visible }))
			);
		}
	);

	server.registerTool(
		"create_label",
		{
			title: "Create label",
			description:
				"Create a label in an organization, or return the existing one if a label with this name already exists.",
			inputSchema: z.object({
				org: z.string().describe('Organization slug (e.g. "platform") or id.'),
				name: z.string().min(1),
				color: z.string().optional().describe("Hex color, e.g. #3B82F6. Defaults to a neutral gray."),
				visible: z.enum(["public", "private"]).optional().describe("Default public."),
			}),
		},
		async ({ org, name, color, visible }) => {
			if (!claims) return toolError("Unauthorized.");

			const resolved = await resolveAndRateLimitOrg(claims.userId, org);
			if ("error" in resolved) return toolError(resolved.error);
			const { orgId } = resolved;

			const allowed = await assertMcpAccess(claims.userId, orgId, claims.scopes, "content.manageLabels");
			if (!allowed) {
				return toolError(
					"You don't have permission to manage labels here — the token is missing the content.manageLabels scope, or your role in this organization doesn't allow it."
				);
			}

			const label = await getOrCreateLabel(orgId, name.trim(), color?.trim() || undefined, visible ?? "public");
			return toolJson(label);
		}
	);

	server.registerTool(
		"list_categories",
		{
			title: "List categories",
			description: "List an organization's categories, with their ids for update_task.",
			inputSchema: z.object({
				org: z.string().describe('Organization slug (e.g. "platform") or id.'),
			}),
		},
		async ({ org }) => {
			if (!claims) return toolError("Unauthorized.");

			const resolved = await resolveAndRateLimitOrg(claims.userId, org);
			if ("error" in resolved) return toolError(resolved.error);
			const { orgId } = resolved;

			const allowed = await assertMcpAccess(claims.userId, orgId, claims.scopes, "tasks.read");
			if (!allowed) {
				return toolError(
					"You don't have permission to read categories here — the token is missing the tasks.read scope, or your role in this organization doesn't allow it."
				);
			}

			const categories = await db.query.category.findMany({
				where: (category) => eq(category.organizationId, orgId),
				orderBy: (category, { asc }) => asc(category.name),
			});
			return toolJson(categories.map((c) => ({ id: c.id, name: c.name, color: c.color, icon: c.icon })));
		}
	);

	server.registerTool(
		"list_members",
		{
			title: "List members",
			description: "List an organization's members, with their user ids for set_task_assignees.",
			inputSchema: z.object({
				org: z.string().describe('Organization slug (e.g. "platform") or id.'),
			}),
		},
		async ({ org }) => {
			if (!claims) return toolError("Unauthorized.");

			const resolved = await resolveAndRateLimitOrg(claims.userId, org);
			if ("error" in resolved) return toolError(resolved.error);
			const { orgId } = resolved;

			const allowed = await assertMcpAccess(claims.userId, orgId, claims.scopes, "tasks.read");
			if (!allowed) {
				return toolError(
					"You don't have permission to list members here — the token is missing the tasks.read scope, or your role in this organization doesn't allow it."
				);
			}

			const members = await db.query.member.findMany({
				where: (member) => eq(member.organizationId, orgId),
				with: { user: { columns: { id: true, name: true, displayName: true, image: true } } },
			});
			return toolJson(members.map((m) => ({ id: m.user.id, name: m.user.name, displayName: m.user.displayName })));
		}
	);
}
