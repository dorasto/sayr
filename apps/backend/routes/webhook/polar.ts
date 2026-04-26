import { Hono } from "hono";
import { db } from "@repo/database";
import * as schema from "@repo/database";
import { type TeamPermissions } from "@repo/database";
import { and, eq, inArray, or } from "drizzle-orm";
import { Polar, validateEvent, Subscription, CustomerSeat } from "@repo/auth";
import { sseBroadcastByUserId } from "../events";
import { createTraceAsync } from "@repo/opentelemetry/trace";
import { AppEnv } from "@/index";

const app = new Hono<AppEnv>();

const polarClient = new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN!,
});
function headersToRecord(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
        result[key] = value;
    });
    return result;
}
app.post("/", async (c) => {
    const traceAsync = createTraceAsync();
    const recordWideError = c.get("recordWideError");
    const rawBody = await c.req.text();
    if (!process.env.POLAR_WEBHOOK_SECRET) {
        console.error("❌ Polar webhook secret not configured");
        await recordWideError({
            name: "webhook.polar.secretNotConfigured",
            error: new Error("Polar webhook secret not configured"),
            code: "SecretNotConfigured",
            message: "Polar webhook secret is not configured",
        });
        return c.text("Webhook secret not configured", 500);
    }
    let event;
    try {
        event = validateEvent(
            rawBody,
            headersToRecord(c.req.raw.headers),
            process.env.POLAR_WEBHOOK_SECRET!
        );
    } catch (err) {
        console.error("❌ Webhook verification failed:", err);
        await recordWideError({
            name: "webhook.polar.verificationFailed",
            error: err,
            code: "VerificationFailed",
            message: "Polar webhook signature verification failed",
            contextData: {
                eventType: event?.type,
            },
        });
        return c.text("Invalid signature", 400);
    }

    try {
        switch (event.type) {
            case "subscription.created":
                await traceAsync("handleSubscriptionCreated", async () => {
                    await handleSubscriptionCreated(event.data);
                }, {
                    description: "Handling Polar subscription.created event",
                    data: {
                        eventType: event.type,
                    },
                });
                break;

            case "subscription.updated":
                await traceAsync("handleSubscriptionUpdated", async () => {
                    await handleSubscriptionUpdated(event.data);
                }, {
                    description: "Handling Polar subscription.updated event",
                    data: {
                        eventType: event.type,
                    },
                });
                break;

            case "subscription.canceled":
                await traceAsync("handleSubscriptionCanceled", async () => {
                    await handleSubscriptionCanceled(event.data);
                }, {
                    description: "Handling Polar subscription.canceled event",
                    data: {
                        eventType: event.type,
                    },
                });
                break;
            case "customer_seat.revoked":
                await traceAsync("handleSeatRevoked", async () => {
                    await handleSeatRevoked(event.data);
                }, {
                    description: "Handling Polar customer_seat.revoked event",
                    data: {
                        eventType: event.type,
                    },
                });
                break;
            case "customer_seat.claimed":
                await traceAsync("handleSeatClaimed", async () => {
                    await handleSeatClaimed(event.data);
                }, {
                    description: "Handling Polar customer_seat.claimed event",
                    data: {
                        eventType: event.type,
                    },
                });
                break;
            default:
                console.warn("⚠️ Unhandled event type:", event.type);
        }
    } catch (err) {
        console.error("❌ Webhook handler error:", err);
        await recordWideError({
            name: "webhook.polar.handlerError",
            error: err,
            code: "HandlerError",
            message: `Error handling Polar webhook event: ${(err as Error).message}`,
            contextData: {
                eventType: event.type,
            },
        });
        return c.text("Handler error", 500);
    }

    return c.text(`Event handled: ${event.type}`, 200);
});

export const PolarWebhookHandler = app;

async function handleSubscriptionCreated(data: Subscription) {
    const orgId = data.customer?.externalId;
    if (!orgId) return;

    const isActive =
        data.status === "active" ||
        data.status === "trialing";

    await db.update(schema.schema.organization)
        .set({
            plan: isActive ? "pro" : "free",
            seatCount: data.seats ?? 1,
            polarCustomerId: data.customerId,
            polarSubscriptionId: data.id,
            currentPeriodEnd: data.currentPeriodEnd,
        })
        .where(eq(schema.schema.organization.id, orgId));

    // Assign seats to all current members of the organization in Polar
    const orgMembers = await db.query.member.findMany({
        where: (member) => eq(member.organizationId, orgId),
        with: {
            user: true,
        },
    });
    orgMembers.forEach(async (member) => {
        const seatInfo = await polarClient.customerSeats.assignSeat({
            subscriptionId: data.id,
            externalCustomerId: member.userId,
            immediateClaim: true,
            metadata: {
                userId: member.userId,
                organizationId: orgId,
                action: "initial_seat_assignment",
            },
        });
        if (seatInfo) {
            await db.update(schema.schema.member)
                .set({
                    seatAssignedId: seatInfo.id,
                    seatAssigned: true,
                })
                .where(eq(schema.schema.member.id, member.id));
            console.log(`✅ Assigned seat ${seatInfo.id} to user ${member.user.email} for organization ${orgId}`);
        } else {
            console.warn(`⚠️ Failed to assign seat to user ${member.user.email} for organization ${orgId}`);
        }
    });
    console.log("✅ Subscription created:", orgId);
}

async function handleSubscriptionUpdated(data: Subscription) {
    const orgId = data.customer?.externalId;
    if (!orgId) return;

    const isActive =
        data.status === "active" ||
        data.status === "trialing";

    await db.update(schema.schema.organization)
        .set({
            plan: isActive ? "pro" : "free",
            seatCount: data.seats ?? 1,
            currentPeriodEnd: data.currentPeriodEnd,
        })
        .where(eq(schema.schema.organization.id, orgId));

    console.log("🔄 Subscription updated:", orgId);
}

async function handleSubscriptionCanceled(data: Subscription) {
    const orgId = data.customer?.externalId;
    if (data.status === "active") {
        return;
    }
    if (!orgId) return;

    const FREE_SEAT_LIMIT = 5;

    await db.update(schema.schema.organization)
        .set({
            plan: "free",
            seatCount: FREE_SEAT_LIMIT,
            polarSubscriptionId: null,
            currentPeriodEnd: null
        })
        .where(eq(schema.schema.organization.id, orgId));

    // Auto-assign seats to the top-priority members on downgrade.
    // Priority order:
    //   1. The Polar billing customer (matched by email)
    //   2. Members with admin.administrator permission
    //   3. Members with admin.billing permission
    //   4. Remaining members by join date (oldest first)
    const orgMembers = await db.query.member.findMany({
        where: (member) => eq(member.organizationId, orgId),
        with: {
            user: true,
            teams: {
                with: { team: true },
            },
        },
    });

    const billingEmail = data.customer?.email?.toLowerCase();

    // Helper: check if any of a member's teams grant a specific admin permission
    const hasAdminPermission = (
        member: typeof orgMembers[number],
        key: "administrator" | "billing",
    ): boolean => {
        return (member.teams ?? []).some((mt) => {
            const perms = mt.team?.permissions as TeamPermissions | null;
            return perms?.admin?.[key] === true;
        });
    };

    // Sort members by priority
    const sorted = [...orgMembers].sort((a, b) => {
        // 1. Polar billing customer first
        const aIsBillingCustomer = a.user.email?.toLowerCase() === billingEmail ? 1 : 0;
        const bIsBillingCustomer = b.user.email?.toLowerCase() === billingEmail ? 1 : 0;
        if (aIsBillingCustomer !== bIsBillingCustomer) return bIsBillingCustomer - aIsBillingCustomer;

        // 2. Administrators second
        const aIsAdmin = hasAdminPermission(a, "administrator") ? 1 : 0;
        const bIsAdmin = hasAdminPermission(b, "administrator") ? 1 : 0;
        if (aIsAdmin !== bIsAdmin) return bIsAdmin - aIsAdmin;

        // 3. Billing permission third
        const aIsBilling = hasAdminPermission(a, "billing") ? 1 : 0;
        const bIsBilling = hasAdminPermission(b, "billing") ? 1 : 0;
        if (aIsBilling !== bIsBilling) return bIsBilling - aIsBilling;

        // 4. Oldest members first (by createdAt)
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aTime - bTime;
    });

    // Assign seats to the first N members, unassign the rest
    const seatedIds = new Set(sorted.slice(0, FREE_SEAT_LIMIT).map((m) => m.id));

    for (const member of sorted) {
        const shouldHaveSeat = seatedIds.has(member.id);
        await db.update(schema.schema.member)
            .set({
                seatAssigned: shouldHaveSeat,
                seatAssignedId: null, // Clear Polar seat IDs since there's no active subscription
            })
            .where(eq(schema.schema.member.id, member.id));

        // Notify each member of their seat status change
        sseBroadcastByUserId(member.userId, "", orgId, {
            type: "MEMBER_ACTIONS",
            data: {
                organizationId: orgId,
                userId: member.userId,
                action: shouldHaveSeat ? "SEAT_ASSIGNED" : "SEAT_REVOKED",
            },
        });
    }

    console.log(
        `❌ Subscription canceled for org ${orgId}. Auto-assigned ${seatedIds.size} seats to priority members out of ${sorted.length} total.`,
    );
}

async function handleSeatRevoked(data: CustomerSeat) {
    const org = await db.query.organization.findFirst({
        where: (org) => eq(org.polarSubscriptionId, data.subscriptionId!),
    });

    if (!org) {
        // If no org has this subscriptionId, it may have already been cancelled
        // (polarSubscriptionId is cleared on cancellation). In that case,
        // the cancellation handler already managed seat assignments — skip.
        console.log(
            "🪑 Skipping seat revocation — no active subscription found (likely already cancelled):",
            data.subscriptionId,
        );
        return;
    }

    const user = await db.query.user.findFirst({
        where: (user) =>
            data.seatMetadata?.userId ? eq(user.id, data.seatMetadata!.userId)
                : eq(user.email, data.customerEmail!)
    });

    if (!user) {
        console.warn(
            "⚠️ User not found for revoked seat:",
            data.customerEmail,
            data.seatMetadata?.userId
        );
        return;
    }

    const member = await db.query.member.findFirst({
        where: and(
            eq(schema.schema.member.organizationId, org.id),
            eq(schema.schema.member.userId, user.id)
        ),
    });

    if (!member) {
        console.warn(
            "⚠️ Member record not found:",
            user.id,
            org.id
        );
        return;
    }

    await db
        .update(schema.schema.member)
        .set({
            seatAssigned: false,
            seatAssignedId: null,
        })
        .where(eq(schema.schema.member.id, member.id));

    console.log(
        "🪑 Seat revoked but member retained:",
        user.email,
        org.id
    );

    sseBroadcastByUserId(user.id, "", org.id, {
        type: "MEMBER_ACTIONS",
        data: {
            organizationId: org.id,
            userId: user.id,
            action: "SEAT_REVOKED",
        },
    });
}

async function handleSeatClaimed(data: CustomerSeat) {
    const org = await db.query.organization.findFirst({
        where: (org) => eq(org.polarSubscriptionId, data.subscriptionId!),
    });

    if (!org) {
        console.warn(
            "⚠️ Organization not found for claimed seat:",
            data.subscriptionId
        );
        return;
    }

    let user;

    // ✅ Always prefer metadata userId
    if (data.seatMetadata?.userId) {
        user = await db.query.user.findFirst({
            where: (user) => eq(user.id, data.seatMetadata!.userId),
        });
    } else if (data.customerEmail) {
        user = await db.query.user.findFirst({
            where: (user) => eq(user.email, data.customerEmail!),
        });
    }

    if (!user) {
        console.warn(
            "⚠️ User not found for claimed seat:",
            data.customerEmail,
            data.seatMetadata?.userId
        );
        return;
    }

    // ✅ Check if member exists
    let member = await db.query.member.findFirst({
        where: and(
            eq(schema.schema.member.organizationId, org.id),
            eq(schema.schema.member.userId, user.id)
        ),
    });

    // ✅ Create member if added via Polar UI
    if (!member) {
        const [created] = await db
            .insert(schema.schema.member)
            .values({
                id: crypto.randomUUID(),
                organizationId: org.id,
                userId: user.id,
                seatAssigned: true,
                seatAssignedId: data.id,
            })
            .returning();

        member = created;

        console.log(
            "🆕 Member created via Polar seat claim:",
            user.email,
            org.id
        );
    } else {
        // ✅ Update existing member
        await db
            .update(schema.schema.member)
            .set({
                seatAssigned: true,
                seatAssignedId: data.id,
            })
            .where(eq(schema.schema.member.id, member.id));

        console.log(
            "🪑 Seat assigned to existing member:",
            user.email,
            org.id
        );
    }

    sseBroadcastByUserId(user.id, "", org.id, {
        type: "MEMBER_ACTIONS",
        data: {
            organizationId: org.id,
            userId: user.id,
            action: "SEAT_ASSIGNED",
        },
    });
}