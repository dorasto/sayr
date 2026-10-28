import { randomUUID } from "node:crypto";
import { db, getTasksByUserId, schema, searchTasksForUser } from "@repo/database";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "@/index";
import { apiRouteAdminOrganization } from "./organization";
import { apiRouteAdminRelease } from "./release";
import { apiRouteAdminUser } from "./user";
import { apiRouteAdminNotification } from "./notification";
import { apiRouteAdminIntegrations } from "./integrations";
import { getEffectiveLimits } from "@repo/edition";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { getEditionCapabilities } from "@repo/edition";
import { emitEvent, collectAndInsertSnapshots } from "@/clickhouse";
import { createPolar } from "@polar-sh/sdk/2026-10";
const polarClient = createPolar({
	accessToken: process.env.POLAR_ACCESS_TOKEN!,
});
export const apiRouteAdmin = new Hono<AppEnv>();

// Search tasks across all orgs the user belongs to
apiRouteAdmin.get("/tasks/search", async (c) => {
	const traceAsync = createTraceAsync();

	const session = c.get("session");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const query = c.req.query("q") || "";
	const limitParam = c.req.query("limit");
	const limit = Math.min(Math.max(Number.parseInt(limitParam || "10", 10) || 10, 1), 25);

	if (query.trim().length < 2) {
		return c.json({ success: true, data: [] });
	}

	const results = await traceAsync("tasks.search", () => searchTasksForUser(session.userId, query, limit), {
		description: "Searching tasks across user's organizations",
		data: { userId: session.userId, query, limit },
		onSuccess: (result) => ({
			description: "Task search completed",
			data: { resultCount: result.length },
		}),
	});

	return c.json({ success: true, data: results });
});

// Get all tasks assigned to the logged-in user
apiRouteAdmin.get("/tasks/mine", async (c) => {
	const traceAsync = createTraceAsync();

	const session = c.get("session");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const tasks = await traceAsync("tasks.mine.fetch", () => getTasksByUserId(session.userId), {
		description: "Fetching user's assigned tasks",
		data: { userId: session.userId },
		onSuccess: (result) => ({
			description: "Tasks fetched successfully",
			data: { taskCount: result.length },
		}),
	});

	return c.json({ success: true, data: tasks });
});

apiRouteAdmin.post("/invite", async (c) => {
	const traceAsync = createTraceAsync();
	const recordWideError = c.get("recordWideError");

	const session = c.get("session");
	const user = c.get("user");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const body = await c.req.json().catch(() => null);
	const {
		invite,
		type,
	}: {
		invite: schema.inviteType;
		type: "accept" | "deny";
	} = body ?? {};

	if (!invite || !type) {
		await recordWideError({
			name: "invite.response.validation",
			error: new Error("Invalid request data"),
			code: "INVALID_REQUEST",
			message: "Invite data or type missing",
			contextData: { user_id: session.userId },
		});
		return c.json({ success: false, error: "Invalid request data" }, 400);
	}

	if (type !== "accept" && type !== "deny") {
		await recordWideError({
			name: "invite.response.invalid_type",
			error: new Error("Unknown invite type"),
			code: "UNKNOWN_INVITE_TYPE",
			message: `Unknown invite response type: ${type}`,
			contextData: { user_id: session.userId, type },
		});
		return c.json({ success: false, error: "Unknown invite type" }, 400);
	}

	// ✅ Re-fetch the invite from the database to prevent forged request bodies
	// from mutating invites that don't belong to the caller.
	const fetchedInvite = await db.query.invite.findFirst({
		where: and(eq(schema.invite.id, invite.id), eq(schema.invite.organizationId, invite.organizationId)),
	});

	if (!fetchedInvite) {
		return c.json({ success: false, error: "Invite not found" }, 404);
	}

	if (fetchedInvite.status !== "pending") {
		return c.json({ success: false, error: "Invite is no longer pending" }, 409);
	}

	// Validate that this invite is actually intended for the authenticated user.
	const inviteTargetsUser =
		(fetchedInvite.userId && fetchedInvite.userId === session.userId) ||
		(fetchedInvite.email && user && user.email?.toLowerCase() === fetchedInvite.email.toLowerCase());

	if (!inviteTargetsUser) {
		return c.json({ success: false, error: "This invite is not for your account" }, 403);
	}

	if (type === "accept") {
		// Expired invites can still be declined, but never accepted.
		if (fetchedInvite.expiresAt && fetchedInvite.expiresAt.getTime() < Date.now()) {
			return c.json({ success: false, error: "This invite has expired" }, 410);
		}

		const org = await db.query.organization.findFirst({
			where: eq(schema.organization.id, fetchedInvite.organizationId),
		});

		// Enforce seat limit before accepting
		const assignedMembers = await db.query.member.findMany({
			where: and(
				eq(schema.member.organizationId, fetchedInvite.organizationId),
				eq(schema.member.seatAssigned, true)
			),
			columns: { id: true },
		});
		const { polarBillingEnabled } = getEditionCapabilities();
		const planSeatLimit = getEffectiveLimits(org?.plan).members ?? Infinity;
		// On cloud Pro, seats are purchased: cap at the org's purchased seatCount (kept in
		// sync by the Polar webhook). Self-hosted editions don't bill per seat, and their
		// seatCount column is just the schema default, so only the plan limit applies there.
		const purchasedSeatLimit =
			polarBillingEnabled && org?.plan === "pro" && org.seatCount != null ? org.seatCount : Infinity;
		const seatLimit = Math.min(planSeatLimit, purchasedSeatLimit);
		const hasAvailableSeat = assignedMembers.length < seatLimit;

		// Pro orgs with an active subscription get their seat via Polar. The local seat is
		// only marked assigned once Polar confirms, so a Polar failure can't leave an
		// unpaid seat in the DB.
		const assignSeatViaPolar = Boolean(
			hasAvailableSeat && org?.plan === "pro" && org?.polarSubscriptionId && polarBillingEnabled
		);
		const memberId = randomUUID();

		// ✅ Atomic transaction: mark invite accepted AND create membership together
		await traceAsync(
			"invite.response.accept_transaction",
			() =>
				db.transaction(async (tx) => {
					await tx.update(schema.invite).set({ status: "accepted" }).where(eq(schema.invite.id, fetchedInvite.id));
					await tx.insert(schema.member).values({
						id: memberId,
						userId: session.userId,
						organizationId: fetchedInvite.organizationId,
						seatAssigned: hasAvailableSeat && !assignSeatViaPolar,
					});
				}),
			{
				description: "Accepting invite and creating organization membership",
				data: {
					invite_id: fetchedInvite.id,
					user: { id: session.userId },
					organization: { id: fetchedInvite.organizationId },
					seatAssigned: hasAvailableSeat,
				},
				onSuccess: () => ({
					outcome: "Invite accepted and membership created",
				}),
			}
		);

		// Only assign via Polar if Pro plan with active subscription and seat available
		if (assignSeatViaPolar && org?.polarSubscriptionId) {
			try {
				const seat = await polarClient.customerSeats.assignSeat({
					subscription_id: org.polarSubscriptionId,
					external_customer_id: session.userId,
					immediate_claim: true,
					metadata: {
						userId: session.userId,
						organizationId: fetchedInvite.organizationId,
						action: "invite_accept_seat_assignment",
					},
				});
				await db
					.update(schema.member)
					.set({ seatAssigned: true, seatAssignedId: seat?.id ?? null })
					.where(eq(schema.member.id, memberId));
			} catch (err) {
				// Membership stays, but without a seat — an admin can assign one later from
				// the members page once Polar is reachable.
				await recordWideError({
					name: "invite.response.polar_seat_assign_failed",
					error: err,
					code: "POLAR_SEAT_ASSIGN_FAILED",
					message: "Failed to assign Polar seat on invite accept",
					contextData: {
						user_id: session.userId,
						organization_id: fetchedInvite.organizationId,
						member_id: memberId,
					},
				});
			}
		}

		// ✅ Trace acceptance event
		await traceAsync("invite.response.accepted", async () => {}, {
			description: "User accepted organization invite",
			data: {
				user: { id: session.userId },
				organization: { id: fetchedInvite.organizationId },
			},
		});

		emitEvent({
			event_type: "member.invite_accepted",
			actor_id: session.userId,
			target_id: session.userId,
			org_id: fetchedInvite.organizationId,
			metadata: { invite_id: fetchedInvite.id },
		});

		emitEvent({
			event_type: "member.joined",
			actor_id: session.userId,
			target_id: session.userId,
			org_id: fetchedInvite.organizationId,
		});

		return c.json({ success: true });
	}

	// ✅ type === "deny" — update status and record event
	await traceAsync(
		"invite.response.deny_status",
		() => db.update(schema.invite).set({ status: "declined" }).where(eq(schema.invite.id, fetchedInvite.id)),
		{
			description: "Declining invite",
			data: {
				invite_id: fetchedInvite.id,
				user: { id: session.userId },
				organization: { id: fetchedInvite.organizationId },
			},
		}
	);

	await traceAsync("invite.response.denied", async () => {}, {
		description: "User denied organization invite",
		data: {
			user: { id: session.userId },
			organization: { id: fetchedInvite.organizationId },
		},
	});

	emitEvent({
		event_type: "member.invite_declined",
		actor_id: session.userId,
		target_id: session.userId,
		org_id: fetchedInvite.organizationId,
		metadata: { invite_id: fetchedInvite.id },
	});

	return c.json({ success: true });
});

// Manually trigger a platform snapshot (cloud only)
apiRouteAdmin.post("/snapshots/trigger", async (c) => {
	const session = c.get("session");
	const user = c.get("user");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}
	// Platform-admin only, same gate as the /console routes.
	if (user?.role !== "admin") {
		return c.json({ success: false, error: "FORBIDDEN" }, 403);
	}

	const { clickhouseEnabled } = getEditionCapabilities();
	if (!clickhouseEnabled) {
		return c.json({ success: false, error: "Not available on this edition" }, 403);
	}

	const body = await c.req.json().catch(() => ({}));
	const date: string | undefined = typeof body?.date === "string" ? body.date : undefined;

	try {
		const result = await collectAndInsertSnapshots(date);
		return c.json({ success: true, ...result, date: date ?? new Date().toISOString().slice(0, 10) });
	} catch (err) {
		console.error("[snapshots] Manual trigger failed:", err);
		return c.json({ success: false, error: "Failed to insert snapshots" }, 500);
	}
});

// Organization routes
apiRouteAdmin.route("/organization", apiRouteAdminOrganization);

// Release routes
apiRouteAdmin.route("/release", apiRouteAdminRelease);

// User routes
apiRouteAdmin.route("/user", apiRouteAdminUser);

// Notification routes
apiRouteAdmin.route("/notification", apiRouteAdminNotification);

// Integrations routes
apiRouteAdmin.route("/integrations", apiRouteAdminIntegrations);
