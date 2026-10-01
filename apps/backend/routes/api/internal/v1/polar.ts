import { Hono } from "hono";
import { db, getOrganization, schema } from "@repo/database";
import { eq } from "drizzle-orm";
import { AppEnv } from "@/index";
import { traceOrgPermissionCheck } from "@/util";
import { createPolar } from "@polar-sh/sdk/2026-10";
const polarClient = createPolar({
	accessToken: process.env.POLAR_ACCESS_TOKEN!,
});
const app = new Hono<AppEnv>();
const isProd = process.env.APP_ENV === "production";

/**
 * Helper: create a Polar customer session token for the given org.
 * Returns the token string or null if the org has no Polar customer.
 */
async function getCustomerSessionToken(polarCustomerId: string, orgId: string): Promise<string> {
	const session = await polarClient?.customerSessions.create({
		customer_id: polarCustomerId,
		return_url: isProd
			? `https://admin.sayr.io/settings/org/${orgId}/billing`
			: `http://admin.app.localhost:3000/settings/org/${orgId}/billing`,
	});
	return session?.token as any;
}
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

	const isAuthorized = await traceOrgPermissionCheck(session.userId, orgId, "admin.billing");
	if (!isAuthorized) {
		return c.json({ success: false, error: "Permission denied" }, 401);
	}

	// 2️⃣ Ensure Polar org customer exists
	let customerId: any = org.polarCustomerId;
	const orgEmail = email?.replace("@", `+sayr-${org.slug}@`) || "";

	if (!customerId) {
		const customer = await polarClient?.customers.create({
			external_id: org.id,
			email: orgEmail,
			name: org.name,
		});

		customerId = customer?.id;

		await db
			.update(schema.organization)
			.set({ polarCustomerId: customerId })
			.where(eq(schema.organization.id, org.id));
	}

	// 3️⃣ Create checkout under ORG customer
	const checkout = await polarClient?.checkouts.create({
		products: [productId],
		external_customer_id: org.id,
		customer_email: orgEmail,
		customer_name: `${org.name} (${email})`,
		seats: org.members.length || org.seatCount || 1,
		success_url: isProd ? `https://admin.sayr.io/settings/org/${org.id}/billing?checkout_id={CHECKOUT_ID}` : `http://admin.app.localhost:3000/settings/org/${org.id}/billing?checkout_id={CHECKOUT_ID}`,
		return_url: isProd ? `https://admin.sayr.io/settings/org/${org.id}/billing` : `http://admin.app.localhost:3000/settings/org/${org.id}/billing`,
		metadata: {
			firstUserEmail: email || "",
			firstUserId: userId || "",
			firstUserName: name || "",
		},
	});

	// 4️⃣ Redirect user
	return c.redirect(checkout?.url || "");
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
	const isAuthorized = await traceOrgPermissionCheck(session.userId, orgId, "admin.billing");
	if (!isAuthorized) {
		return c.json({ success: false, error: "Permission denied" }, 401);
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
	const portal = await polarClient?.customerSessions.create({
		customer_id: customerId,
		return_url: isProd ? `https://admin.sayr.io/settings/org/${org.id}/billing` : `http://admin.app.localhost:3000/settings/org/${org.id}/billing`,
	});
	// 4️⃣ Redirect user
	return c.redirect(portal?.customer_portal_url || "");
});

// ─── Custom Billing Portal (read-only) ──────────────────────────

/**
 * GET /polar/subscription?orgId=...
 * Returns the org's active subscription details from Polar.
 */
app.get("/subscription", async (c) => {
	const orgId = c.req.query("orgId");
	const session = c.get("session");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}
	if (!orgId) {
		return c.json({ success: false, error: "Missing orgId" }, 400);
	}

	const isAuthorized = await traceOrgPermissionCheck(session.userId, orgId, "admin.billing");
	if (!isAuthorized) {
		return c.json({ success: false, error: "Permission denied" }, 401);
	}

	const org = await db.query.organization.findFirst({
		where: eq(schema.organization.id, orgId),
	});

	if (!org) {
		return c.json({ success: false, error: "Organization not found" }, 404);
	}
	if (!org.polarCustomerId) {
		return c.json({ success: false, error: "No billing customer linked" }, 400);
	}
	if (!org.polarSubscriptionId) {
		return c.json({ success: false, error: "No active subscription" }, 400);
	}

	try {
		const token = await getCustomerSessionToken(org.polarCustomerId, org.id);
		const subscription = await polarClient?.customerPortal.subscriptions.get(
			org.polarSubscriptionId,
			{ accessToken: token },
		);
		if (!subscription) {
			return c.json({ success: false, error: "No active subscription" }, 400);
		}

		return c.json({
			success: true,
			data: {
				id: subscription.id,
				status: subscription.status,
				amount: subscription.amount,
				currency: subscription.currency,
				recurring_interval: subscription.recurring_interval,
				current_period_start: subscription.current_period_start,
				current_period_end: subscription.current_period_end,
				cancel_at_period_end: subscription.cancel_at_period_end,
				canceled_at: subscription.canceled_at,
				started_at: subscription.started_at,
				seats: subscription.seats ?? null,
				product: {
					id: subscription.product.id,
					name: subscription.product.name,
					description: subscription.product.description,
				},
				prices: subscription.prices,
				customer_cancellation_reason: subscription.customer_cancellation_reason,
				customer_cancellation_comment: subscription.customer_cancellation_comment,
			},
		});
	} catch (err) {
		console.error("Failed to fetch subscription from Polar", err);
		return c.json({ success: false, error: "Failed to fetch subscription details" }, 500);
	}
});

/**
 * GET /polar/orders?orgId=...&page=1&limit=10
 * Returns the org's order/invoice history from Polar.
 */
app.get("/orders", async (c) => {
	const orgId = c.req.query("orgId");
	const page = Number(c.req.query("page") || "1");
	const limit = Number(c.req.query("limit") || "10");
	const session = c.get("session");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}
	if (!orgId) {
		return c.json({ success: false, error: "Missing orgId" }, 400);
	}

	const isAuthorized = await traceOrgPermissionCheck(session.userId, orgId, "admin.billing");
	if (!isAuthorized) {
		return c.json({ success: false, error: "Permission denied" }, 401);
	}

	const org = await db.query.organization.findFirst({
		where: eq(schema.organization.id, orgId),
	});

	if (!org) {
		return c.json({ success: false, error: "Organization not found" }, 404);
	}
	if (!org.polarCustomerId) {
		return c.json({ success: false, error: "No billing customer linked" }, 400);
	}

	try {
		const token = await getCustomerSessionToken(org.polarCustomerId, org.id);
		const ordersPage = await polarClient?.customerPortal.orders.list(
			{
				page,
				limit: Math.min(limit, 100),
				sorting: ["-created_at"],
			},
			{ accessToken: token },
		);
		const items = ordersPage?.items.map((order) => ({
			id: order.id,
			createdAt: order.created_at,
			status: order.status,
			paid: order.paid,
			subtotalAmount: order.subtotal_amount,
			discountAmount: order.discount_amount,
			netAmount: order.net_amount,
			taxAmount: order.tax_amount,
			totalAmount: order.total_amount,
			currency: order.currency,
			billingReason: order.billing_reason,
			invoiceNumber: order.invoice_number,
			isInvoiceGenerated: order.is_invoice_generated,
			seats: order.seats ?? null,
			product: order.product
				? {
					id: order.product.id,
					name: order.product.name,
				}
				: null,
			description: order.description,
			items: order.items.map((item) => ({
				id: item.id,
				label: item.label,
				amount: item.amount,
				taxAmount: item.tax_amount,
				proration: item.proration,
			})),
		}));

		return c.json({
			success: true,
			data: {
				items,
				pagination: ordersPage?.pagination,
			},
		});
	} catch (err) {
		console.error("Failed to fetch orders from Polar", err);
		return c.json({ success: false, error: "Failed to fetch order history" }, 500);
	}
});

/**
 * GET /polar/orders/:orderId/invoice?orgId=...
 * Returns the invoice URL for a specific order.
 */
app.get("/orders/:orderId/invoice", async (c) => {
	const orgId = c.req.query("orgId");
	const orderId = c.req.param("orderId");
	const session = c.get("session");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}
	if (!orgId) {
		return c.json({ success: false, error: "Missing orgId" }, 400);
	}

	const isAuthorized = await traceOrgPermissionCheck(session.userId, orgId, "admin.billing");
	if (!isAuthorized) {
		return c.json({ success: false, error: "Permission denied" }, 401);
	}

	const org = await db.query.organization.findFirst({
		where: eq(schema.organization.id, orgId),
	});

	if (!org) {
		return c.json({ success: false, error: "Organization not found" }, 404);
	}
	if (!org.polarCustomerId) {
		return c.json({ success: false, error: "No billing customer linked" }, 400);
	}

	try {
		const token = await getCustomerSessionToken(org.polarCustomerId, org.id);
		const invoice = await polarClient?.customerPortal.orders.invoice(
			orderId,
			{ accessToken: token }
		);

		return c.json({
			success: true,
			data: { url: invoice?.url || "" },
		});
	} catch (err) {
		console.error("Failed to fetch invoice from Polar", err);
		return c.json({ success: false, error: "Failed to fetch invoice" }, 500);
	}
});

/**
 * PATCH /polar/subscription/seats
 * Updates the seat count on the org's Polar subscription.
 * Body: { orgId: string; seats: number }
 */
app.patch("/subscription/seats", async (c) => {
	const session = c.get("session");

	if (!session?.userId) {
		return c.json({ success: false, error: "UNAUTHORIZED" }, 401);
	}

	const body = await c.req.json<{ orgId?: string; seats?: number }>();
	const { orgId, seats } = body;

	if (!orgId) {
		return c.json({ success: false, error: "Missing orgId" }, 400);
	}
	if (typeof seats !== "number" || seats < 1 || !Number.isInteger(seats)) {
		return c.json({ success: false, error: "seats must be a positive integer" }, 400);
	}
	if (seats > 1000) {
		return c.json({ success: false, error: "Maximum seat count is 1000" }, 400);
	}

	const isAuthorized = await traceOrgPermissionCheck(session.userId, orgId, "admin.billing");
	if (!isAuthorized) {
		return c.json({ success: false, error: "Permission denied" }, 401);
	}

	const org = await db.query.organization.findFirst({
		where: eq(schema.organization.id, orgId),
	});

	if (!org) {
		return c.json({ success: false, error: "Organization not found" }, 404);
	}
	if (!org.polarCustomerId) {
		return c.json({ success: false, error: "No billing customer linked" }, 400);
	}
	if (!org.polarSubscriptionId) {
		return c.json({ success: false, error: "No active subscription" }, 400);
	}

	try {
		const updated = await polarClient?.subscriptions.update(org.polarSubscriptionId, {
			seats,
		});

		return c.json({
			success: true,
			data: {
				seats: updated?.seats ?? seats,
			},
		});
	} catch (err) {
		console.error("Failed to update subscription seats on Polar", err);
		return c.json({ success: false, error: "Failed to update seat count" }, 500);
	}
});

export const apiRoutePolar = app;