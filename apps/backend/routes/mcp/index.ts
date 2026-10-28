import { createMcpProtectedRequestHandler } from "@better-auth/mcp";
import { mcpOAuthConfig } from "@repo/auth";
import {
	addLogEventTask,
	createComment,
	createTask,
	db,
	getOrganizationMembers,
	getOrganizations,
	getTaskById,
	schema,
	toPublicTask,
} from "@repo/database";
import { getMcpRateLimitPerMinute } from "@repo/edition";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { markdownToProsekitJSON } from "../../prosekit/parser";
import { findSSEClientsByUserId, sseBroadcastIndividual, sseBroadcastPublic, sseBroadcastToRoom } from "../events";
import type { ServerEventBaseMessage } from "../events/types";
import { resolveOrganizationId, resolveTaskId } from "../../lib/apiRefs";
import { assertMcpAccess } from "../../lib/mcp/auth";
import { checkMcpRateLimit } from "../../lib/mcp/rateLimit";
import { baseTaskWhere } from "../api/internal/v1/task";

/**
 * MCP server (SAY-31) for Sayr's API — lets an AI agent act on a user's
 * behalf against tasks/comments/releases, authenticated via the Better Auth
 * `mcp()` OAuth provider wired in `@repo/auth`. apps/backend runs as a
 * separate process from where that auth server is mounted (apps/start), so
 * tokens are verified against its published JWKS rather than in-process —
 * see `createMcpProtectedRequestHandler` below.
 *
 * Tool surface mirrors `@sayrio/cli`'s `/v1/me/*` coverage. This is the
 * first slice (read-mostly: whoami, list_organizations, list_tasks) —
 * establishing the auth/rate-limit/scope pattern every further tool
 * (create_task, comments, releases, ...) follows identically.
 */

interface McpUserClaims {
	userId: string;
	scopes: string[];
}

function claimsFromAuthInfo(
	authInfo: { extra?: Record<string, unknown>; scopes?: string[] } | undefined
): McpUserClaims | null {
	const userId = authInfo?.extra?.userId;
	if (typeof userId !== "string" || !userId) return null;
	return { userId, scopes: authInfo?.scopes ?? [] };
}

/** Resolves the target org, applies the per-(user, org) rate limit, and returns its plan. Null means "deny — caller should surface the attached reason". */
async function resolveAndRateLimitOrg(
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

function toolError(message: string) {
	return { content: [{ type: "text" as const, text: message }], isError: true };
}

function toolJson(data: unknown) {
	return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function buildMcpServer(claims: McpUserClaims | null): McpServer {
	const server = new McpServer({ name: "sayr", version: "1.0.0" });

	// whoami / list_organizations are account-identity facts, not task-level
	// access — mirrors profile.ts's own comment: no scope required beyond a
	// valid token, only org rate-limiting applies (and only once an org is
	// named, which neither of these tools takes).
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
			description: "Organizations the authenticated user is a member of.",
		},
		async () => {
			if (!claims) return toolError("Unauthorized.");
			const organizations = await getOrganizations(claims.userId);
			return toolJson(organizations.map((org) => ({ id: org.id, slug: org.slug, name: org.name, plan: org.plan })));
		}
	);

	server.registerTool(
		"list_tasks",
		{
			title: "List tasks",
			description:
				"List tasks in an organization the user is a member of. Always includes public and private tasks, never degrades to a public-only view.",
			inputSchema: z.object({
				org: z.string().describe('Organization slug (e.g. "platform") or id.'),
				query: z.string().optional().describe("Search query."),
				includeClosed: z.boolean().optional().describe("Include done/canceled tasks. Default false."),
				limit: z.number().int().min(1).max(30).optional().describe("Max results, up to 30. Default 30."),
			}),
		},
		async ({ org, query, includeClosed, limit }) => {
			if (!claims) return toolError("Unauthorized.");

			const resolved = await resolveAndRateLimitOrg(claims.userId, org);
			if ("error" in resolved) return toolError(resolved.error);
			const { orgId } = resolved;

			const allowed = await assertMcpAccess(claims.userId, orgId, claims.scopes, "tasks.read");
			if (!allowed) {
				return toolError(
					"You don't have permission to read tasks here — the token is missing the tasks.read scope, or your role in this organization doesn't allow it."
				);
			}

			const where = baseTaskWhere(orgId, undefined, query, includeClosed ?? false, false);
			const rows = await db.query.task.findMany({
				where,
				columns: { embedding: false },
				orderBy: (t, { desc }) => [desc(t.createdAt)],
				limit: limit ?? 30,
				with: {
					labels: { with: { label: true } },
					assignees: { with: { user: { columns: { id: true, name: true, image: true } } } },
				},
			});

			return toolJson(
				rows.map((task) => ({
					id: task.id,
					shortId: task.shortId,
					title: task.title,
					status: task.status,
					priority: task.priority,
					visible: task.visible,
					labels: task.labels.map((l) => l.label.name),
					assignees: task.assignees.map((a) => a.user.name),
					createdAt: task.createdAt,
				}))
			);
		}
	);

	server.registerTool(
		"create_task",
		{
			title: "Create task",
			description: "Create a new task in an organization the user is a member of.",
			inputSchema: z.object({
				org: z.string().describe('Organization slug (e.g. "platform") or id.'),
				title: z.string().min(1),
				description: z.string().optional().describe("Markdown description."),
				status: z.enum(["backlog", "todo", "in-progress", "done", "canceled"]).optional(),
				priority: z.enum(["none", "low", "medium", "high", "urgent"]).optional(),
			}),
		},
		async ({ org, title, description, status, priority }) => {
			if (!claims) return toolError("Unauthorized.");

			const resolved = await resolveAndRateLimitOrg(claims.userId, org);
			if ("error" in resolved) return toolError(resolved.error);
			const { orgId } = resolved;

			const allowed = await assertMcpAccess(claims.userId, orgId, claims.scopes, "tasks.create");
			if (!allowed) {
				return toolError(
					"You don't have permission to create tasks here — the token is missing the tasks.create scope, or your role in this organization doesn't allow it."
				);
			}

			const descriptionProsekit = description ? markdownToProsekitJSON(description) : undefined;
			const task = await createTask(
				orgId,
				{ title, description: descriptionProsekit, status, priority, visible: "public", parentId: null },
				claims.userId
			);
			if (!task) return toolError("Failed to create task.");

			await addLogEventTask(
				task.id,
				orgId,
				"created",
				null,
				{ status, priority, title, labels: [], assignees: [] },
				claims.userId,
				descriptionProsekit
			);

			const taskWithData = await getTaskById(orgId, task.id);
			await broadcastTaskCreated(orgId, taskWithData);

			return toolJson({ id: task.id, shortId: task.shortId, title: task.title });
		}
	);

	server.registerTool(
		"create_comment",
		{
			title: "Create comment",
			description: "Post a comment on a task.",
			inputSchema: z.object({
				org: z.string().describe('Organization slug (e.g. "platform") or id.'),
				task: z.string().describe('Task short id (the number in SAY-123, e.g. "123") or task id.'),
				content: z.string().min(1).describe("Markdown content."),
				visibility: z.enum(["public", "internal"]).optional().describe("Default public."),
			}),
		},
		async ({ org, task: taskRef, content, visibility }) => {
			if (!claims) return toolError("Unauthorized.");

			const resolved = await resolveAndRateLimitOrg(claims.userId, org);
			if ("error" in resolved) return toolError(resolved.error);
			const { orgId } = resolved;

			// Commenting requires org membership only, matching /v1/me/create_comment.
			const allowed = await assertMcpAccess(claims.userId, orgId, claims.scopes, "tasks.comment");
			if (!allowed) {
				return toolError(
					"You don't have permission to comment here — the token is missing the tasks.comment scope, or you're not a member of this organization."
				);
			}

			const taskId = await resolveTaskId(orgId, taskRef);
			if (!taskId) return toolError(`No task found for "${taskRef}" in this organization.`);

			const comment = await createComment(
				orgId,
				taskId,
				markdownToProsekitJSON(content),
				visibility ?? "public",
				claims.userId,
				"sayr"
			);
			if (!comment) return toolError("Failed to create comment.");

			await broadcastCommentCreated(orgId, taskId, visibility ?? "public");

			return toolJson({ id: comment.id, taskId });
		}
	);

	return server;
}

/** Mirrors tasks.ts's own create-broadcast block — keeps browsers in sync regardless of which surface created the task. */
async function broadcastTaskCreated(orgId: string, taskWithData: Awaited<ReturnType<typeof getTaskById>>) {
	const data = { type: "CREATE_TASK" as ServerEventBaseMessage["type"], data: taskWithData };
	sseBroadcastToRoom(orgId, "tasks", data);
	if (taskWithData?.visible === "public") {
		const publicData = { ...data, data: toPublicTask(taskWithData) };
		sseBroadcastPublic(orgId, publicData);
	}
	const members = await getOrganizationMembers(orgId);
	members.forEach((member) => {
		const clients = findSSEClientsByUserId(member.userId);
		clients.forEach((client) => client.channel !== "tasks" && sseBroadcastIndividual(client, data, orgId));
	});
}

/** Mirrors comments.ts's own create-broadcast block. */
async function broadcastCommentCreated(orgId: string, taskId: string, visibility: "public" | "internal") {
	const data = { type: "UPDATE_TASK_COMMENTS" as ServerEventBaseMessage["type"], data: { id: taskId } };
	sseBroadcastToRoom(orgId, `task:${taskId}`, data);
	if (visibility === "public") sseBroadcastPublic(orgId, { ...data });
	const members = await getOrganizationMembers(orgId);
	members.forEach((member) => {
		const clients = findSSEClientsByUserId(member.userId);
		clients.forEach(
			(client) =>
				client.orgId !== orgId &&
				!(client.channel === `task:${taskId}` || client.channel === "tasks") &&
				sseBroadcastIndividual(client, data, orgId)
		);
	});
}

const mcpHandler = createMcpHandler((ctx) => buildMcpServer(claimsFromAuthInfo(ctx.authInfo)), { legacy: "reject" });

export const mcpFetchHandler = createMcpProtectedRequestHandler(
	{
		issuer: mcpOAuthConfig.issuer,
		audience: mcpOAuthConfig.resource,
		jwksUrl: mcpOAuthConfig.jwksUrl,
	},
	async (request, claims) => {
		const authInfo = {
			token: "",
			clientId: typeof claims.client_id === "string" ? claims.client_id : "",
			scopes: typeof claims.scope === "string" ? claims.scope.split(" ") : [],
			extra: { userId: claims.sub },
		};
		return mcpHandler.fetch(request, { authInfo });
	}
);

/**
 * RFC 9728 protected-resource metadata for `mcpOAuthConfig.resource`. Not
 * served automatically the way it would be if the resource and authorization
 * server were the same process (the mcp() plugin's own doc) — apps/backend is
 * a separate resource server that only verifies tokens via JWKS, so it has to
 * publish this itself. The WWW-Authenticate challenge on an unauthenticated
 * /mcp request points here.
 */
export function mcpProtectedResourceMetadata(): Response {
	return Response.json({
		resource: mcpOAuthConfig.resource,
		authorization_servers: [mcpOAuthConfig.issuer],
		jwks_uri: mcpOAuthConfig.jwksUrl,
		bearer_methods_supported: ["header"],
		resource_name: "Sayr",
	});
}
