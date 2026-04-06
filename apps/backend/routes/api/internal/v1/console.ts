import { auth, polarClient } from "@repo/auth";
import { auth as authSchema, db, schema, getUsersByIds, type OrganizationSettings, type OrgAiSettings, defaultOrgAiSettings } from "@repo/database";
import { and, count, eq, ilike, inArray, isNotNull, or, sql, desc, asc } from "drizzle-orm";
import { ensureCdnUrl } from "@repo/util";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "@/index";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { paginatedSuccessResponse, errorResponse, successResponse } from "../../../../responses";
import { queryAiUsageByOrg, queryAiUsageSummaryAllOrgs } from "@/clickhouse";

const userTable = authSchema.user;
const sessionTable = authSchema.session;
const accountTable = authSchema.account;

export const apiRouteConsole = new Hono<AppEnv>();

// ──────────────────────────────────────────────
// GET /console/users — paginated, filterable user list
// ──────────────────────────────────────────────
apiRouteConsole.get("/users", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");
	const user = c.get("user");

	if (!session?.userId) {
		return c.json(errorResponse("UNAUTHORIZED"), 401);
	}
	if (user?.role !== "admin") {
		return c.json(errorResponse("FORBIDDEN"), 403);
	}

	// Parse query params
	const page = Math.max(Number(c.req.query("page")) || 1, 1);
	const requestedLimit = Number(c.req.query("limit")) || 25;
	const limit = Math.min(Math.max(requestedLimit, 1), 100);
	const offset = (page - 1) * limit;
	const search = c.req.query("search")?.trim() || "";
	const status = c.req.query("status") || ""; // "active" | "banned" | "pending" | ""
	const role = c.req.query("role") || ""; // "admin" | "user" | ""
	const sortBy = c.req.query("sortBy") || "createdAt";
	const sortDir = c.req.query("sortDirection") === "asc" ? "asc" : "desc";

	try {
		const result = await traceAsync(
			"console.users.list",
			async () => {
				// Build WHERE conditions
				const conditions = [];

				if (search) {
					conditions.push(
						or(
							ilike(userTable.name, `%${search}%`),
							ilike(userTable.email, `%${search}%`),
						),
					);
				}

				if (status === "active") {
					conditions.push(eq(userTable.emailVerified, true));
					conditions.push(
						or(eq(userTable.banned, false), sql`${userTable.banned} IS NULL`),
					);
				} else if (status === "banned") {
					conditions.push(eq(userTable.banned, true));
				} else if (status === "pending") {
					conditions.push(eq(userTable.emailVerified, false));
					conditions.push(
						or(eq(userTable.banned, false), sql`${userTable.banned} IS NULL`),
					);
				}

				if (role === "admin") {
					conditions.push(eq(userTable.role, "admin"));
				} else if (role === "user") {
					conditions.push(
						or(eq(userTable.role, "user"), sql`${userTable.role} IS NULL`),
					);
				}

				const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

				// Count total
				const [countResult] = await db
					.select({ count: count() })
					.from(userTable)
					.where(whereClause);
				const totalItems = Number(countResult?.count ?? 0);
				const totalPages = Math.max(Math.ceil(totalItems / limit), 1);

				// Determine sort column
				const sortColumn =
					sortBy === "name" ? userTable.name :
						sortBy === "email" ? userTable.email :
							sortBy === "role" ? userTable.role :
								userTable.createdAt;

				const orderFn = sortDir === "asc" ? asc : desc;

				// Fetch users with org membership count
				const users = await db
					.select({
						id: userTable.id,
						name: userTable.name,
						displayName: userTable.displayName,
						email: userTable.email,
						emailVerified: userTable.emailVerified,
						image: userTable.image,
						createdAt: userTable.createdAt,
						updatedAt: userTable.updatedAt,
						role: userTable.role,
						banned: userTable.banned,
						banReason: userTable.banReason,
						banExpires: userTable.banExpires,
						organizationCount: db.$count(schema.member, eq(schema.member.userId, userTable.id)),
					})
					.from(userTable)
					.where(whereClause)
					.orderBy(orderFn(sortColumn))
					.limit(limit)
					.offset(offset);

				// Fetch connected provider IDs for all returned users
				const userIds = users.map((u) => u.id);
				const accountRows = userIds.length > 0
					? await db
						.select({
							userId: accountTable.userId,
							providerId: accountTable.providerId,
						})
						.from(accountTable)
						.where(inArray(accountTable.userId, userIds))
					: [];

				// Group provider IDs by userId (exclude credential provider)
				const connectionsByUser = new Map<string, string[]>();
				for (const row of accountRows) {
					if (row.providerId === "credential") continue;
					const existing = connectionsByUser.get(row.userId) ?? [];
					if (!existing.includes(row.providerId)) {
						existing.push(row.providerId);
					}
					connectionsByUser.set(row.userId, existing);
				}

				// Transform images to CDN URLs and attach connections
				const transformedUsers = users.map((u) => ({
					...u,
					image: u.image ? ensureCdnUrl(u.image) : null,
					connections: connectionsByUser.get(u.id) ?? [],
				}));

				return {
					users: transformedUsers,
					pagination: {
						limit,
						page,
						totalPages,
						totalItems,
						hasMore: page < totalPages,
					},
				};
			},
			{
				description: "Listing console users with pagination",
				data: { page, limit, search, status, role },
			},
		);

		return c.json(paginatedSuccessResponse(result.users, result.pagination));
	} catch (err) {
		await recordWideError({
			name: "console.users.list.failed",
			error: err,
			code: "CONSOLE_USERS_LIST_FAILED",
			message: "Failed to list users",
			contextData: { adminId: session.userId },
		});
		return c.json(errorResponse("Failed to list users"), 500);
	}
});

// ──────────────────────────────────────────────
// GET /console/users/:userId — user detail with orgs, sessions, activity
// ──────────────────────────────────────────────
apiRouteConsole.get("/users/:userId", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");
	const currentUser = c.get("user");

	if (!session?.userId) {
		return c.json(errorResponse("UNAUTHORIZED"), 401);
	}
	if (currentUser?.role !== "admin") {
		return c.json(errorResponse("FORBIDDEN"), 403);
	}

	const userId = c.req.param("userId");
	if (!userId) {
		return c.json(errorResponse("User ID is required"), 400);
	}

	try {
		const result = await traceAsync(
			"console.users.detail",
			async () => {
				// 1. Fetch the user
				const [targetUser] = await db
					.select({
						id: userTable.id,
						name: userTable.name,
						displayName: userTable.displayName,
						email: userTable.email,
						emailVerified: userTable.emailVerified,
						image: userTable.image,
						createdAt: userTable.createdAt,
						updatedAt: userTable.updatedAt,
						role: userTable.role,
						banned: userTable.banned,
						banReason: userTable.banReason,
						banExpires: userTable.banExpires,
					})
					.from(userTable)
					.where(eq(userTable.id, userId));

				if (!targetUser) {
					return null;
				}

				// 2. Fetch organizations with teams
				const memberships = await db.query.member.findMany({
					where: eq(schema.member.userId, userId),
					with: {
						organization: true,
						teams: {
							with: {
								team: true,
							},
						},
					},
				});

				const organizations = memberships.map((m) => ({
					id: m.organization.id,
					name: m.organization.name,
					slug: m.organization.slug,
					logo: m.organization.logo ? ensureCdnUrl(m.organization.logo) : null,
					joinedAt: m.createdAt,
					teams: m.teams.map((mt) => ({
						id: mt.team.id,
						name: mt.team.name,
						isAdmin: mt.team.permissions?.admin?.administrator === true,
						permissions: mt.team.permissions,
					})),
				}));

				// 3. Fetch recent sessions (no token!)
				const sessions = await db
					.select({
						id: sessionTable.id,
						createdAt: sessionTable.createdAt,
						updatedAt: sessionTable.updatedAt,
						expiresAt: sessionTable.expiresAt,
						ipAddress: sessionTable.ipAddress,
						userAgent: sessionTable.userAgent,
						impersonatedBy: sessionTable.impersonatedBy,
					})
					.from(sessionTable)
					.where(eq(sessionTable.userId, userId))
					.orderBy(desc(sessionTable.createdAt))
					.limit(20);

				// 4. Fetch connected accounts (no tokens!)
				const accounts = await db
					.select({
						id: accountTable.id,
						providerId: accountTable.providerId,
						createdAt: accountTable.createdAt,
						updatedAt: accountTable.updatedAt,
						scope: accountTable.scope,
					})
					.from(accountTable)
					.where(eq(accountTable.userId, userId));

				// 5. Activity aggregates from taskTimeline
				const activityAggregates = await db
					.select({
						eventType: schema.taskTimeline.eventType,
						count: count(),
					})
					.from(schema.taskTimeline)
					.where(eq(schema.taskTimeline.actorId, userId))
					.groupBy(schema.taskTimeline.eventType);

				// 6. Recent activity (no task content, no task IDs)
				const recentActivity = await db
					.select({
						id: schema.taskTimeline.id,
						eventType: schema.taskTimeline.eventType,
						createdAt: schema.taskTimeline.createdAt,
						organizationId: schema.taskTimeline.organizationId,
						fromValue: schema.taskTimeline.fromValue,
						toValue: schema.taskTimeline.toValue,
					})
					.from(schema.taskTimeline)
					.where(eq(schema.taskTimeline.actorId, userId))
					.orderBy(desc(schema.taskTimeline.createdAt))
					.limit(50);

				// Resolve org names for recent activity
				const orgIds = [...new Set(recentActivity.map((a) => a.organizationId))];
				const orgsForActivity = orgIds.length
					? await db
						.select({
							id: schema.organization.id,
							name: schema.organization.name,
							slug: schema.organization.slug,
						})
						.from(schema.organization)
						.where(inArray(schema.organization.id, orgIds))
					: [];
				const orgMap = new Map(orgsForActivity.map((o) => [o.id, o]));

				const recentActivityWithOrg = recentActivity.map((a) => {
					const org = orgMap.get(a.organizationId);
					// Only include fromValue/toValue for safe event types (status, priority changes)
					const safeEventTypes = [
						"status_change",
						"priority_change",
						"category_change",
						"release_change",
					];
					const isSafe = safeEventTypes.includes(a.eventType);
					return {
						id: a.id,
						eventType: a.eventType,
						createdAt: a.createdAt,
						organization: org ? { name: org.name, slug: org.slug } : null,
						fromValue: isSafe ? a.fromValue : undefined,
						toValue: isSafe ? a.toValue : undefined,
					};
				});

				return {
					user: {
						...targetUser,
						image: targetUser.image ? ensureCdnUrl(targetUser.image) : null,
					},
					organizations,
					sessions,
					accounts,
					activity: {
						aggregates: activityAggregates.map((a) => ({
							eventType: a.eventType,
							count: Number(a.count),
						})),
						recent: recentActivityWithOrg,
					},
				};
			},
			{
				description: "Fetching console user detail",
				data: { userId, adminId: session.userId },
			},
		);

		if (!result) {
			return c.json(errorResponse("User not found"), 404);
		}

		return c.json(successResponse(result));
	} catch (err) {
		await recordWideError({
			name: "console.users.detail.failed",
			error: err,
			code: "CONSOLE_USER_DETAIL_FAILED",
			message: "Failed to fetch user detail",
			contextData: { userId, adminId: session.userId },
		});
		return c.json(errorResponse("Failed to fetch user detail"), 500);
	}
});

apiRouteConsole.post("/set-role", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const session = c.get("session");
	const user = c.get("user");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	if (user?.role !== "admin") {
		await recordWideError({
			name: "console.set_role.forbidden",
			error: new Error("Forbidden"),
			code: "FORBIDDEN",
			message: "User does not have admin privileges",
			contextData: {
				user: { id: user?.id },
			},
		});
		return c.json({ success: false, error: "FORBIDDEN" }, 403);
	}

	const body = await c.req.json().catch(() => null);
	const {
		userId,
		role,
	}: { userId: string; role: "admin" | "user" } = body ?? {};

	if (!userId || !role) {
		await recordWideError({
			name: "console.set_role.validation",
			error: new Error("Invalid request data"),
			code: "INVALID_REQUEST",
			message: "User ID or role missing",
			contextData: {
				user: { id: session.userId },
			},
		});
		return c.json({ success: false, error: "Invalid request data" }, 400);
	}

	const result = await traceAsync(
		"console.set_role.update",
		() =>
			auth.api.setRole({
				body: { userId, role },
				headers: c.req.raw.headers,
			}),
		{
			description: "Updating user role",
			data: {
				user: { id: userId },
				admin: { id: session.userId },
				role,
			},
			onSuccess: () => ({
				outcome: "User role updated",
				data: {
					user: { id: userId },
					role,
				},
			}),
		}
	);
	return c.json({ success: true, data: result?.user });
});

apiRouteConsole.get("/system-api-keys", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const session = c.get("session");
	const user = c.get("user");

	if (!session?.userId) {
		return c.json(errorResponse("UNAUTHORIZED"), 401);
	}
	if (user?.role !== "admin") {
		return c.json(errorResponse("FORBIDDEN"), 403);
	}

	try {
		const systemUser = await db.query.user.findFirst({
			where: eq(authSchema.user.role, "system"),
		});

		if (!systemUser) {
			return c.json(errorResponse("System user not found"), 404);
		}

		const result = await traceAsync(
			"console.system_api_keys.list",
			() =>
				db
					.select({
						id: schema.apikey.id,
						name: schema.apikey.name,
						prefix: schema.apikey.prefix,
						enabled: schema.apikey.enabled,
						expiresAt: schema.apikey.expiresAt,
						createdAt: schema.apikey.createdAt,
						lastRequest: schema.apikey.lastRequest,
						requestCount: schema.apikey.requestCount,
					})
					.from(schema.apikey)
					.where(eq(schema.apikey.userId, systemUser.id))
					.orderBy(desc(schema.apikey.createdAt)),
			{
				description: "Listing system API keys",
				data: { adminId: session.userId },
			}
		);

		return c.json(successResponse(result));
	} catch (err) {
		await recordWideError({
			name: "console.system_api_keys.list.failed",
			error: err,
			code: "CONSOLE_SYSTEM_API_KEYS_LIST_FAILED",
			message: "Failed to list system API keys",
			contextData: { adminId: session.userId },
		});
		return c.json(errorResponse("Failed to list system API keys"), 500);
	}
});

apiRouteConsole.post("/system-api-keys", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const session = c.get("session");
	const user = c.get("user");

	if (!session?.userId) {
		return c.json(errorResponse("UNAUTHORIZED"), 401);
	}
	if (user?.role !== "admin") {
		return c.json(errorResponse("FORBIDDEN"), 403);
	}

	const body = await c.req.json().catch(() => null);
	const { name } = body ?? {};

	if (!name || typeof name !== "string" || name.trim().length === 0) {
		return c.json(errorResponse("API key name is required"), 400);
	}

	try {
		const systemUser = await db.query.user.findFirst({
			where: eq(authSchema.user.role, "system"),
		});

		if (!systemUser) {
			return c.json(errorResponse("System user not found"), 404);
		}

		const result = await traceAsync(
			"console.system_api_keys.create",
			() =>
				auth.api.createApiKey({
					body: {
						name: name.trim(),
						userId: systemUser.id,
						rateLimitEnabled: false,
					},
				}),
			{
				description: "Creating system API key",
				data: { adminId: session.userId, keyName: name },
			}
		);

		return c.json(successResponse(result));
	} catch (err) {
		console.log(err);
		await recordWideError({
			name: "console.system_api_keys.create.failed",
			error: err,
			code: "CONSOLE_SYSTEM_API_KEYS_CREATE_FAILED",
			message: "Failed to create system API key",
			contextData: { adminId: session.userId, keyName: name },
		});
		return c.json(errorResponse("Failed to create system API key"), 500);
	}
});

// ──────────────────────────────────────────────
// GET /console/organizations — paginated, filterable org list
// ──────────────────────────────────────────────
apiRouteConsole.get("/organizations", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");
	const user = c.get("user");

	if (!session?.userId) {
		return c.json(errorResponse("UNAUTHORIZED"), 401);
	}
	if (user?.role !== "admin") {
		return c.json(errorResponse("FORBIDDEN"), 403);
	}

	const page = Math.max(Number(c.req.query("page")) || 1, 1);
	const requestedLimit = Number(c.req.query("limit")) || 25;
	const limit = Math.min(Math.max(requestedLimit, 1), 100);
	const offset = (page - 1) * limit;
	const search = c.req.query("search")?.trim() || "";
	const plan = c.req.query("plan") || "";
	const sortBy = c.req.query("sortBy") || "createdAt";
	const sortDir = c.req.query("sortDirection") === "asc" ? "asc" : "desc";

	try {
		const result = await traceAsync(
			"console.organizations.list",
			async () => {
				const conditions = [];

				if (search) {
					conditions.push(
						or(
							ilike(schema.organization.name, `%${search}%`),
							ilike(schema.organization.slug, `%${search}%`),
						),
					);
				}

				if (plan === "free") {
					conditions.push(eq(schema.organization.plan, "free"));
				} else if (plan === "pro") {
					conditions.push(eq(schema.organization.plan, "pro"));
				}

				const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

				const [countResult] = await db
					.select({ count: count() })
					.from(schema.organization)
					.where(whereClause);
				const totalItems = Number(countResult?.count ?? 0);
				const totalPages = Math.max(Math.ceil(totalItems / limit), 1);

				const sortColumn =
					sortBy === "name" ? schema.organization.name :
						sortBy === "plan" ? schema.organization.plan :
							schema.organization.createdAt;

				const orderFn = sortDir === "asc" ? asc : desc;

				const orgs = await db
					.select({
						id: schema.organization.id,
						name: schema.organization.name,
						slug: schema.organization.slug,
						logo: schema.organization.logo,
						plan: schema.organization.plan,
						seatCount: schema.organization.seatCount,
						isSystemOrg: schema.organization.isSystemOrg,
						shortId: schema.organization.shortId,
						createdAt: schema.organization.createdAt,
						updatedAt: schema.organization.updatedAt,
						createdBy: schema.organization.createdBy,
						memberCount: db.$count(schema.member, eq(schema.member.organizationId, schema.organization.id)),
					})
					.from(schema.organization)
					.where(whereClause)
					.orderBy(orderFn(sortColumn))
					.limit(limit)
					.offset(offset);

				const transformedOrgs = orgs.map((o) => ({
					...o,
					logo: o.logo ? ensureCdnUrl(o.logo) : null,
				}));

				return {
					orgs: transformedOrgs,
					pagination: {
						limit,
						page,
						totalPages,
						totalItems,
						hasMore: page < totalPages,
					},
				};
			},
			{
				description: "Listing console organizations with pagination",
				data: { page, limit, search, plan },
			},
		);

		return c.json(paginatedSuccessResponse(result.orgs, result.pagination));
	} catch (err) {
		await recordWideError({
			name: "console.organizations.list.failed",
			error: err,
			code: "CONSOLE_ORGANIZATIONS_LIST_FAILED",
			message: "Failed to list organizations",
			contextData: { adminId: session.userId },
		});
		return c.json(errorResponse("Failed to list organizations"), 500);
	}
});

// ──────────────────────────────────────────────
// GET /console/organizations/ai-usage-summary — 30-day AI totals per org (cloud-only)
// ──────────────────────────────────────────────
apiRouteConsole.get("/organizations/ai-usage-summary", async (c) => {
	const session = c.get("session");
	const user = c.get("user");
	const recordWideError = c.get("recordWideError");

	if (!session?.userId) {
		return c.json(errorResponse("UNAUTHORIZED"), 401);
	}
	if (user?.role !== "admin") {
		return c.json(errorResponse("FORBIDDEN"), 403);
	}

	try {
		const summary = await queryAiUsageSummaryAllOrgs(30);
		if (!summary) {
			return c.json(successResponse([]));
		}
		return c.json(successResponse(summary));
	} catch (err) {
		await recordWideError({
			name: "console.organizations.ai_usage_summary.failed",
			error: err,
			code: "CONSOLE_ORG_AI_USAGE_SUMMARY_FAILED",
			message: "Failed to fetch AI usage summary from ClickHouse",
			contextData: {},
		});
		return c.json(errorResponse("Failed to fetch AI usage summary"), 500);
	}
});

// ──────────────────────────────────────────────
// GET /console/organizations/mrr-summary — MRR per org via Polar (admin API)
// ──────────────────────────────────────────────
apiRouteConsole.get("/organizations/mrr-summary", async (c) => {
	const session = c.get("session");
	const user = c.get("user");
	const recordWideError = c.get("recordWideError");

	if (!session?.userId) {
		return c.json(errorResponse("UNAUTHORIZED"), 401);
	}
	if (user?.role !== "admin") {
		return c.json(errorResponse("FORBIDDEN"), 403);
	}

	if (!polarClient) {
		return c.json(successResponse([]));
	}

	try {
		// Fetch all orgs that have a Polar subscription
		const orgsWithSub = await db
			.select({
				id: schema.organization.id,
				polarSubscriptionId: schema.organization.polarSubscriptionId,
				plan: schema.organization.plan,
			})
			.from(schema.organization)
			.where(isNotNull(schema.organization.polarSubscriptionId));

		if (orgsWithSub.length === 0) {
			return c.json(successResponse([]));
		}

		// Batch-fetch each subscription from Polar admin API
		const results = await Promise.allSettled(
			orgsWithSub.map(async (org) => {
				const sub = await polarClient!.subscriptions.get({ id: org.polarSubscriptionId! });
				const isYearly = sub.recurringInterval === "year";
				const mrrCents = Math.round(sub.amount / (isYearly ? 12 : 1));
				return {
					org_id: org.id,
					mrr_cents: mrrCents,
					currency: sub.currency ?? "usd",
					status: sub.status,
					seats: (sub as Record<string, unknown>).seats as number | null ?? null,
					recurring_interval: sub.recurringInterval,
				};
			}),
		);

		const summaries = results
			.filter((r): r is PromiseFulfilledResult<{
				org_id: string;
				mrr_cents: number;
				currency: string;
				status: string;
				seats: number | null;
				recurring_interval: string;
			}> => r.status === "fulfilled")
			.map((r) => r.value);

		return c.json(successResponse(summaries));
	} catch (err) {
		await recordWideError({
			name: "console.organizations.mrr_summary.failed",
			error: err,
			code: "CONSOLE_ORG_MRR_SUMMARY_FAILED",
			message: "Failed to fetch MRR summary from Polar",
			contextData: {},
		});
		return c.json(successResponse([]));
	}
});

// ──────────────────────────────────────────────
// GET /console/organizations/:orgId — org detail
// ──────────────────────────────────────────────
apiRouteConsole.get("/organizations/:orgId", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");
	const currentUser = c.get("user");

	if (!session?.userId) {
		return c.json(errorResponse("UNAUTHORIZED"), 401);
	}
	if (currentUser?.role !== "admin") {
		return c.json(errorResponse("FORBIDDEN"), 403);
	}

	const orgId = c.req.param("orgId");
	if (!orgId) {
		return c.json(errorResponse("Organization ID is required"), 400);
	}

	try {
		const result = await traceAsync(
			"console.organizations.detail",
			async () => {
				const [org] = await db
					.select({
						id: schema.organization.id,
						name: schema.organization.name,
						slug: schema.organization.slug,
						logo: schema.organization.logo,
						bannerImg: schema.organization.bannerImg,
						description: schema.organization.description,
						plan: schema.organization.plan,
						seatCount: schema.organization.seatCount,
						isSystemOrg: schema.organization.isSystemOrg,
						shortId: schema.organization.shortId,
						createdAt: schema.organization.createdAt,
						updatedAt: schema.organization.updatedAt,
						createdBy: schema.organization.createdBy,
						polarCustomerId: schema.organization.polarCustomerId,
						polarSubscriptionId: schema.organization.polarSubscriptionId,
						currentPeriodEnd: schema.organization.currentPeriodEnd,
						settings: schema.organization.settings,
					})
					.from(schema.organization)
					.where(eq(schema.organization.id, orgId));

				if (!org) {
					return null;
				}

				// Fetch members with user info and teams
				const memberships = await db.query.member.findMany({
					where: eq(schema.member.organizationId, orgId),
					with: {
						user: {
							columns: {
								id: true,
								name: true,
								displayName: true,
								email: true,
								image: true,
								role: true,
								banned: true,
							},
						},
						teams: {
							with: {
								team: {
									columns: {
										id: true,
										name: true,
										isSystem: true,
										permissions: true,
									},
								},
							},
						},
					},
				});

				const members = memberships.map((m) => ({
					id: m.id,
					userId: m.userId,
					joinedAt: m.createdAt,
					seatAssigned: m.seatAssigned,
					user: {
						id: m.user.id,
						name: m.user.name,
						displayName: m.user.displayName,
						email: m.user.email,
						image: m.user.image ? ensureCdnUrl(m.user.image) : null,
						role: m.user.role,
						banned: m.user.banned,
					},
					teams: m.teams.map((mt) => ({
						id: mt.team.id,
						name: mt.team.name,
						isSystem: mt.team.isSystem,
						isAdmin: mt.team.permissions?.admin?.administrator === true,
						permissions: mt.team.permissions,
					})),
				}));

				return {
					org: {
						...org,
						logo: org.logo ? ensureCdnUrl(org.logo) : null,
						bannerImg: org.bannerImg ? ensureCdnUrl(org.bannerImg) : null,
					},
					members,
				};
			},
			{
				description: "Fetching console organization detail",
				data: { orgId, adminId: session.userId },
			},
		);

		if (!result) {
			return c.json(errorResponse("Organization not found"), 404);
		}

		return c.json(successResponse(result));
	} catch (err) {
		await recordWideError({
			name: "console.organizations.detail.failed",
			error: err,
			code: "CONSOLE_ORGANIZATION_DETAIL_FAILED",
			message: "Failed to fetch organization detail",
			contextData: { orgId, adminId: session.userId },
		});
		return c.json(errorResponse("Failed to fetch organization detail"), 500);
	}
});

apiRouteConsole.delete("/system-api-keys/:keyId", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const session = c.get("session");
	const user = c.get("user");

	if (!session?.userId) {
		return c.json(errorResponse("UNAUTHORIZED"), 401);
	}
	if (user?.role !== "admin") {
		return c.json(errorResponse("FORBIDDEN"), 403);
	}

	const keyId = c.req.param("keyId");
	if (!keyId) {
		return c.json(errorResponse("API key ID is required"), 400);
	}

	try {
		const systemUser = await db.query.user.findFirst({
			where: eq(authSchema.user.role, "system"),
		});

		if (!systemUser) {
			return c.json(errorResponse("System user not found"), 404);
		}

		await traceAsync(
			"console.system_api_keys.delete",
			() =>
				db.delete(schema.apikey).where(
					and(
						eq(schema.apikey.id, keyId),
						eq(schema.apikey.userId, systemUser.id),
					),
				),
			{
				description: "Deleting system API key",
				data: { adminId: session.userId, keyId },
			}
		);

		return c.json(successResponse({ deleted: true }));
	} catch (err) {
		console.log("🚀 ~ err:", err);
		await recordWideError({
			name: "console.system_api_keys.delete.failed",
			error: err,
			code: "CONSOLE_SYSTEM_API_KEYS_DELETE_FAILED",
			message: "Failed to delete system API key",
			contextData: { adminId: session.userId, keyId },
		});
		return c.json(errorResponse("Failed to delete system API key"), 500);
	}
});

// ──────────────────────────────────────────────
// GET /console/organizations/:orgId/ai-usage — AI usage from ClickHouse (cloud-only)
// ──────────────────────────────────────────────
apiRouteConsole.get("/organizations/:orgId/ai-usage", async (c) => {
	const session = c.get("session");
	const user = c.get("user");
	const recordWideError = c.get("recordWideError");

	if (!session?.userId) {
		return c.json(errorResponse("UNAUTHORIZED"), 401);
	}
	if (user?.role !== "admin") {
		return c.json(errorResponse("FORBIDDEN"), 403);
	}

	const { orgId } = c.req.param();
	const days = Math.min(Math.max(Number(c.req.query("days")) || 30, 1), 365);

	try {
		const result = await queryAiUsageByOrg(orgId, days);
		if (!result) {
			return c.json(errorResponse("AI usage data is not available on this edition"), 503);
		}

		// Enrich rows: resolve actor_id → user summary, target_id (taskId) → task shortId + title
		const actorIds = [...new Set(result.rows.map((r) => r.actor_id).filter(Boolean))];
		const taskIds = [...new Set(result.rows.map((r) => r.target_id).filter(Boolean))];

		const [users, tasks] = await Promise.all([
			getUsersByIds(actorIds),
			taskIds.length > 0
				? db
					.select({ id: schema.task.id, shortId: schema.task.shortId, title: schema.task.title })
					.from(schema.task)
					.where(inArray(schema.task.id, taskIds))
				: Promise.resolve([]),
		]);

		const userMap = new Map(users.map((u) => [u.id, u]));
		const taskMap = new Map(tasks.map((t) => [t.id, t]));
		const rootDomain = process.env.VITE_ROOT_DOMAIN ?? "";

		// Fetch the org slug once so we can build task URLs
		const org = await db
			.select({ slug: schema.organization.slug })
			.from(schema.organization)
			.where(eq(schema.organization.id, orgId))
			.limit(1);
		const orgSlug = org[0]?.slug ?? "";

		const enrichedRows = result.rows.map((row) => {
			const user = userMap.get(row.actor_id);
			const task = taskMap.get(row.target_id);
			return {
				...row,
				actor_name: user?.displayName ?? user?.name ?? null,
				actor_image: user?.image ? ensureCdnUrl(user.image) : null,
				task_short_id: task?.shortId ?? null,
				task_title: task?.title ?? null,
				task_url: task?.shortId != null && orgSlug && rootDomain
					? `https://${orgSlug}.${rootDomain}/${task.shortId}`
					: null,
			};
		});

		return c.json(successResponse({ rows: enrichedRows, monthlySummary: result.monthlySummary }));
	} catch (err) {
		await recordWideError({
			name: "console.organizations.ai_usage.failed",
			error: err,
			code: "CONSOLE_ORG_AI_USAGE_FAILED",
			message: "Failed to fetch AI usage from ClickHouse",
			contextData: { orgId, days },
		});
		return c.json(errorResponse("Failed to fetch AI usage"), 500);
	}
});

// ──────────────────────────────────────────────
// PATCH /console/organizations/:orgId/ai-settings — update org AI settings (admin-only)
// ──────────────────────────────────────────────
const orgAiSettingsPatchSchema = z.object({
	disabled: z.boolean().optional(),
	rateLimited: z
		.union([
			z.object({
				until: z.string().datetime({ message: "until must be a valid ISO 8601 datetime" }),
				reason: z.string().max(500).optional(),
			}),
			z.null(),
		])
		.optional(),
	taskSummary: z.boolean().optional(),
});

apiRouteConsole.patch("/organizations/:orgId/ai-settings", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");
	const session = c.get("session");
	const user = c.get("user");

	if (!session?.userId) {
		return c.json(errorResponse("UNAUTHORIZED"), 401);
	}
	if (user?.role !== "admin") {
		return c.json(errorResponse("FORBIDDEN"), 403);
	}

	const orgId = c.req.param("orgId");
	if (!orgId) {
		return c.json(errorResponse("Organization ID is required"), 400);
	}

	let patch: z.infer<typeof orgAiSettingsPatchSchema>;
	try {
		const raw = await c.req.json();
		patch = orgAiSettingsPatchSchema.parse(raw);
	} catch {
		return c.json(errorResponse("Invalid request body"), 400);
	}

	try {
		const result = await traceAsync(
			"console.organizations.ai_settings.update",
			async () => {
				// Fetch current org settings
				const [org] = await db
					.select({ settings: schema.organization.settings })
					.from(schema.organization)
					.where(eq(schema.organization.id, orgId));

				if (!org) {
					return null;
				}

				// Merge AI settings: existing (or defaults) + incoming patch
				const currentAi: OrgAiSettings = (org.settings as OrganizationSettings | null)?.ai ?? { ...defaultOrgAiSettings };
				const updatedAi: OrgAiSettings = {
					...currentAi,
					...(patch.disabled !== undefined ? { disabled: patch.disabled } : {}),
					...(patch.rateLimited !== undefined ? { rateLimited: patch.rateLimited } : {}),
					...(patch.taskSummary !== undefined ? { taskSummary: patch.taskSummary } : {}),
				};

				const currentSettings: OrganizationSettings = {
					allowActionsOnClosedTasks: true,
					publicActions: true,
					enablePublicPage: true,
					publicTaskAllowBlank: true,
					publicTaskFields: { labels: true, category: true, priority: true },
					...(org.settings as OrganizationSettings | null),
					ai: updatedAi,
				};

				await db
					.update(schema.organization)
					.set({ settings: currentSettings, updatedAt: new Date() })
					.where(eq(schema.organization.id, orgId));

				return updatedAi;
			},
			{
				description: "Updating org AI settings via console",
				data: { orgId, adminId: session.userId, patch },
			},
		);

		if (result === null) {
			return c.json(errorResponse("Organization not found"), 404);
		}

		return c.json(successResponse({ ai: result }));
	} catch (err) {
		await recordWideError({
			name: "console.organizations.ai_settings.update.failed",
			error: err,
			code: "CONSOLE_ORG_AI_SETTINGS_UPDATE_FAILED",
			message: "Failed to update org AI settings",
			contextData: { orgId, adminId: session.userId },
		});
		return c.json(errorResponse("Failed to update AI settings"), 500);
	}
});