import { Hono } from "hono";
import { db } from "@repo/database";
import * as schema from "@repo/database";
import { and, eq, or } from "drizzle-orm";
import { Polar, validateEvent, Subscription, CustomerSeat } from "@repo/auth";
import { broadcastByUserId } from "../ws";

const app = new Hono();

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
    const rawBody = await c.req.text();
    let event;
    try {
        event = validateEvent(
            rawBody,
            headersToRecord(c.req.raw.headers),
            process.env.POLAR_WEBHOOK_SECRET!
        );
    } catch (err) {
        console.error("❌ Webhook verification failed:", err);
        return c.text("Invalid signature", 400);
    }

    try {
        switch (event.type) {
            case "subscription.created":
                await handleSubscriptionCreated(event.data);
                break;

            case "subscription.updated":
                await handleSubscriptionUpdated(event.data);
                break;

            case "subscription.canceled":
                await handleSubscriptionCanceled(event.data);
                break;
            case "customer_seat.revoked":
                await handleSeatRevoked(event.data);
                break;
            case "customer_seat.claimed":
                await handleSeatClaimed(event.data);
                break;
            default:
                console.warn("⚠️ Unhandled event type:", event.type);
        }
    } catch (err) {
        console.error("❌ Webhook handler error:", err);
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
    if (!orgId) return;

    await db.update(schema.schema.organization)
        .set({
            plan: "free",
            seatCount: 5,
            polarSubscriptionId: null,
        })
        .where(eq(schema.schema.organization.id, orgId));

    console.log("❌ Subscription canceled:", orgId);
}

async function handleSeatRevoked(data: CustomerSeat) {
    const org = await db.query.organization.findFirst({
        where: (org) => eq(org.polarSubscriptionId, data.subscriptionId!),
    });

    if (!org) {
        console.warn(
            "⚠️ Organization not found for revoked seat:",
            data.subscriptionId
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

    broadcastByUserId(user.id, "", org.id, {
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

    broadcastByUserId(user.id, "", org.id, {
        type: "MEMBER_ACTIONS",
        data: {
            organizationId: org.id,
            userId: user.id,
            action: "SEAT_ASSIGNED",
        },
    });
}