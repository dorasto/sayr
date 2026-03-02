import { Hono } from "hono";
import { db } from "@repo/database";
import * as schema from "@repo/database";
import { eq } from "drizzle-orm";
import { Polar, validateEvent, Subscription } from "@repo/auth";

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

    // ✅ Assign first seat to initial user
    if (data.metadata?.firstUserId) {
        await polarClient.customerSeats.assignSeat({
            subscriptionId: data.id,
            externalCustomerId: data.metadata.firstUserId || "" as any,
            immediateClaim: true,
            metadata: {
                userId: data.metadata.firstUserId,
                organizationId: orgId,
                action: "initial_seat_assignment",
            },
        });
    }

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