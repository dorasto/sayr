import { auth } from "@repo/auth";
import { auth as authSchema, db, schema } from "@repo/database";
import { ensureCdnUrl } from "@repo/util";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { getSessionCookie } from "better-auth/cookies";
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

/**
 * Verify the current request belongs to an authenticated admin user.
 * Throws a redirect if not authenticated or not an admin.
 */
async function requireAdmin() {
	const headers = getRequestHeaders();
	const h = new Headers(headers);
	const cookie = getSessionCookie(h);

	if (!cookie) {
		throw redirect({ to: "/auth/login" });
	}

	const session = await auth.api.getSession({ headers: h });
	if (!session?.user) {
		throw redirect({ to: "/auth/login" });
	}

	if (session.user.role !== "admin") {
		throw redirect({ to: "/" });
	}

	return session.user;
}

const userTable = authSchema.user;
const sessionTable = authSchema.session;
const accountTable = authSchema.account;

// ──────────────────────────────────────────────
// getConsoleUsersServer — paginated user list for SSR loader
// ──────────────────────────────────────────────

type ConsoleUsersInput = {
	page?: number;
	limit?: number;
	search?: string;
	status?: "active" | "banned" | "pending" | "";
	role?: "admin" | "user" | "";
	sortBy?: string;
	sortDirection?: "asc" | "desc";
};

export const getConsoleUsersServer = createServerFn({ method: "GET" })
	.inputValidator((data: ConsoleUsersInput) => data)
	.handler(async ({ data }) => {
		await requireAdmin();

		const page = Math.max(data.page || 1, 1);
		const requestedLimit = data.limit || 25;
		const limit = Math.min(Math.max(requestedLimit, 1), 100);
		const offset = (page - 1) * limit;
		const search = data.search?.trim() || "";
		const status = data.status || "";
		const role = data.role || "";
		const sortBy = data.sortBy || "createdAt";
		const sortDir = data.sortDirection === "asc" ? "asc" : "desc";

		// Build WHERE conditions
		const conditions = [];

		if (search) {
			conditions.push(
				or(ilike(userTable.name, `%${search}%`), ilike(userTable.email, `%${search}%`)),
			);
		}

		if (status === "active") {
			conditions.push(eq(userTable.emailVerified, true));
			conditions.push(or(eq(userTable.banned, false), sql`${userTable.banned} IS NULL`));
		} else if (status === "banned") {
			conditions.push(eq(userTable.banned, true));
		} else if (status === "pending") {
			conditions.push(eq(userTable.emailVerified, false));
			conditions.push(or(eq(userTable.banned, false), sql`${userTable.banned} IS NULL`));
		}

		if (role === "admin") {
			conditions.push(eq(userTable.role, "admin"));
		} else if (role === "user") {
			conditions.push(or(eq(userTable.role, "user"), sql`${userTable.role} IS NULL`));
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		// Count total
		const [countResult] = await db.select({ count: count() }).from(userTable).where(whereClause);
		const totalItems = Number(countResult?.count ?? 0);
		const totalPages = Math.max(Math.ceil(totalItems / limit), 1);

		// Determine sort column
		const sortColumn =
			sortBy === "name"
				? userTable.name
				: sortBy === "email"
					? userTable.email
					: sortBy === "role"
						? userTable.role
						: userTable.createdAt;

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

		// Transform images to CDN URLs
		const transformedUsers = users.map((u) => ({
			...u,
			image: u.image ? ensureCdnUrl(u.image) : null,
		}));

		return {
			data: transformedUsers,
			pagination: {
				limit,
				page,
				totalPages,
				totalItems,
				hasMore: page < totalPages,
			},
		};
	});

// ──────────────────────────────────────────────
// getConsoleUserServer — user detail for SSR loader
// ──────────────────────────────────────────────

export const getConsoleUserServer = createServerFn({ method: "GET" })
	.inputValidator((data: { userId: string }) => data)
	.handler(async ({ data }) => {
		const { userId } = data;
		try {
			await requireAdmin();

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
				throw redirect({ to: "/console" });
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

			const safeEventTypes = ["status_change", "priority_change", "category_change", "release_change"];
			const recentActivityWithOrg = recentActivity.map((a) => {
				const org = orgMap.get(a.organizationId);
				const isSafe = safeEventTypes.includes(a.eventType);
				return {
					id: a.id,
					eventType: a.eventType,
					createdAt: a.createdAt,
					organization: org ? { name: org.name, slug: org.slug } : null,
					fromValue: (isSafe ? a.fromValue : undefined) as string | null | undefined,
					toValue: (isSafe ? a.toValue : undefined) as string | null | undefined,
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
		} catch (error) {
			// If it's already a redirect, re-throw it
			if (error && typeof error === "object" && "redirect" in error) {
				throw error;
			}
			throw redirect({ to: "/console" });
		}
	});
