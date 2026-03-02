import { Hono } from "hono";
import { db, getOrganization, schema } from "@repo/database";
import { eq } from "drizzle-orm";
import { polarClient } from "@repo/auth";
import { AppEnv } from "@/index";

const app = new Hono<AppEnv>();
const isProd = process.env.APP_ENV === "production";
app.get("/checkout", async (c) => {
    const orgId = c.req.query("orgId");
    const email = c.req.query("email");
    const userId = c.req.query("userId");
    const name = c.req.query("name");
    const session = c.get("session");
    const productId = process.env.POLAR_PRODUCT_ID;

    if (!productId) {
        throw new Error("POLAR_PRODUCT_ID is not set");
    }
    if (!session?.userId) {
        return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
    }

    if (!orgId) {
        return c.json({ error: "Missing orgId" }, 400);
    }

    // 1️⃣ Fetch org
    const org = await getOrganization(orgId, session.userId);

    if (!org) {
        return c.json({ error: "Org not found" }, 404);
    }

    // 2️⃣ Ensure Polar org customer exists
    let customerId = org.polarCustomerId;
    const orgEmail = email?.replace("@", `+sayr-${org.slug}@`) || "";

    if (!customerId) {
        const customer = await polarClient.customers.create({
            externalId: org.id,
            email: orgEmail,
            name: org.name,
        });

        customerId = customer.id;

        await db
            .update(schema.organization)
            .set({ polarCustomerId: customerId })
            .where(eq(schema.organization.id, org.id));
    }

    // 3️⃣ Create checkout under ORG customer
    const checkout = await polarClient.checkouts.create({
        products: [productId],
        externalCustomerId: org.id,
        customerEmail: orgEmail,
        customerName: `${org.name} (${email})`,
        seats: org.members.length || org.seatCount || 1,
        successUrl: isProd ? `https://admin.sayr.io/settings/org/${org.id}/billing?checkout_id={CHECKOUT_ID}` : `http://admin.app.localhost:3000/settings/org/${org.id}/billing?checkout_id={CHECKOUT_ID}`,
        returnUrl: isProd ? `https://admin.sayr.io/settings/org/${org.id}/billing` : `http://admin.app.localhost:3000/settings/org/${org.id}/billing`,
        metadata: {
            firstUserEmail: email || "",
            firstUserId: userId || "",
            firstUserName: name || "",
        },
    });

    // 4️⃣ Redirect user
    return c.redirect(checkout.url);
});

app.get("/customer-portal", async (c) => {
    const orgId = c.req.query("orgId");
    const session = c.get("session");

    if (!session?.userId) {
        return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
    }

    if (!orgId) {
        return c.json({ error: "Missing orgId" }, 400);
    }
    // 1️⃣ Fetch org
    const org = await db.query.organization.findFirst({
        where: eq(schema.organization.id, orgId),
    });

    if (!org) throw new Error("Org not found");

    // 2️⃣ Ensure Polar org customer exists
    let customerId = org.polarCustomerId;

    if (!customerId) {
        throw new Error("Customer not found for org");
    }
    const portal = await polarClient.customerSessions.create({
        customerId: customerId,
        returnUrl: isProd ? `https://admin.sayr.io/settings/org/${org.id}/billing` : `http://admin.app.localhost:3000/settings/org/${org.id}/billing`,
    });
    // 4️⃣ Redirect user
    return c.redirect(portal.customerPortalUrl);
});

export const apiRoutePolar = app;