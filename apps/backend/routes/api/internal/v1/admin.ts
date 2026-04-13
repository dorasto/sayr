import { randomUUID } from "node:crypto";
import {
  db,
  getTasksByUserId,
  schema,
  searchTasksForUser,
} from "@repo/database";
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
import { polarClient } from "@repo/auth";
import { getEditionCapabilities } from "@repo/edition";
import { emitEvent, collectAndInsertSnapshots } from "@/clickhouse";

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
  const limit = Math.min(
    Math.max(Number.parseInt(limitParam || "10", 10) || 10, 1),
    25,
  );

  if (query.trim().length < 2) {
    return c.json({ success: true, data: [] });
  }

  const results = await traceAsync(
    "tasks.search",
    () => searchTasksForUser(session.userId, query, limit),
    {
      description: "Searching tasks across user's organizations",
      data: { userId: session.userId, query, limit },
      onSuccess: (result) => ({
        description: "Task search completed",
        data: { resultCount: result.length },
      }),
    },
  );

  return c.json({ success: true, data: results });
});

// Get all tasks assigned to the logged-in user
apiRouteAdmin.get("/tasks/mine", async (c) => {
  const traceAsync = createTraceAsync();

  const session = c.get("session");

  if (!session?.userId) {
    return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
  }

  const tasks = await traceAsync(
    "tasks.mine.fetch",
    () => getTasksByUserId(session.userId),
    {
      description: "Fetching user's assigned tasks",
      data: { userId: session.userId },
      onSuccess: (result) => ({
        description: "Tasks fetched successfully",
        data: { taskCount: result.length },
      }),
    },
  );

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
    where: and(
      eq(schema.invite.id, invite.id),
      eq(schema.invite.organizationId, invite.organizationId),
    ),
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
    (fetchedInvite.email && user && user.email?.toLowerCase() === fetchedInvite.email.toLowerCase())

  if (!inviteTargetsUser) {
    return c.json({ success: false, error: "This invite is not for your account" }, 403);
  }

  if (type === "accept") {
    const org = await db.query.organization.findFirst({
      where: eq(schema.organization.id, fetchedInvite.organizationId),
    });

    // Enforce seat limit before accepting
    const assignedMembers = await db.query.member.findMany({
      where: and(
        eq(schema.member.organizationId, fetchedInvite.organizationId),
        eq(schema.member.seatAssigned, true),
      ),
      columns: { id: true },
    });
    const seatLimit =
      getEffectiveLimits(org?.plan).members ?? org?.seatCount ?? Infinity;
    const hasAvailableSeat = assignedMembers.length < seatLimit;

    // ✅ Atomic transaction: mark invite accepted AND create membership together
    await traceAsync(
      "invite.response.accept_transaction",
      () =>
        db.transaction(async (tx) => {
          await tx
            .update(schema.invite)
            .set({ status: "accepted" })
            .where(eq(schema.invite.id, fetchedInvite.id));
          await tx.insert(schema.member).values({
            id: randomUUID(),
            userId: session.userId,
            organizationId: fetchedInvite.organizationId,
            seatAssigned: hasAvailableSeat,
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
      },
    );

    // Only assign via Polar if Pro plan with active subscription and seat available
    const { polarBillingEnabled } = getEditionCapabilities();
    if (
      hasAvailableSeat &&
      org?.plan === "pro" &&
      org?.polarSubscriptionId &&
      polarBillingEnabled
    ) {
      try {
        await polarClient?.customerSeats.assignSeat({
          subscriptionId: org.polarSubscriptionId,
          externalCustomerId: session.userId,
          immediateClaim: true,
          metadata: {
            userId: session.userId,
            organizationId: fetchedInvite.organizationId,
            action: "invite_accept_seat_assignment",
          },
        });
      } catch (err) {
        console.error("Failed to assign Polar seat on invite accept:", err);
      }
    }

    // ✅ Trace acceptance event
    await traceAsync("invite.response.accepted", async () => { }, {
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
    () =>
      db
        .update(schema.invite)
        .set({ status: "declined" })
        .where(eq(schema.invite.id, fetchedInvite.id)),
    {
      description: "Declining invite",
      data: {
        invite_id: fetchedInvite.id,
        user: { id: session.userId },
        organization: { id: fetchedInvite.organizationId },
      },
    },
  );

  await traceAsync("invite.response.denied", async () => { }, {
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

  if (!session?.userId) {
    return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
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
