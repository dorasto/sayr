import { auth } from "@repo/auth";
import { auth as authSchema, db, schema } from "@repo/database";
import { and, count, eq, ilike, inArray, or, sql, desc, asc } from "drizzle-orm";
import { ensureCdnUrl } from "@repo/util";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { paginatedSuccessResponse, errorResponse, successResponse } from "../../../../responses";

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
				db.delete(schema.apikey).where(eq(schema.apikey.id, keyId)),
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