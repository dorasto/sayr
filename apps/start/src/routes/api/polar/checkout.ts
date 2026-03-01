import { createFileRoute, redirect } from "@tanstack/react-router";
import { db, schema } from "@repo/database";
import { eq } from "drizzle-orm";
import { polarClient } from "@repo/auth";

export const Route = createFileRoute("/api/polar/checkout")({
  server: {
    handlers: {
      async GET({ request }) {
        const url = new URL(request.url);
        const orgId = url.searchParams.get("orgId");
        const email = url.searchParams.get("email");
        const userId = url.searchParams.get("userId");
        const name = url.searchParams.get("name");

        if (!orgId) {
          throw new Error("Missing orgId");
        }

        // 1️⃣ Fetch org
        const org = await db.query.organization.findFirst({
          where: eq(schema.organization.id, orgId),
        });

        if (!org) throw new Error("Org not found");

        // 2️⃣ Ensure Polar org customer exists
        let customerId = org.polarCustomerId;
        const orgEmail = email?.replace('@', `+sayr-${org.slug}@`) || "";

        if (!customerId) {
          const customer = await polarClient.customers.create({
            externalId: org.id,
            email: orgEmail,
            name: org.name,
          });

          customerId = customer.id;

          await db.update(schema.organization)
            .set({ polarCustomerId: customerId })
            .where(eq(schema.organization.id, org.id));
        }

        // 3️⃣ Create checkout under ORG customer
        const checkout = await polarClient.checkouts.create({
          products: [process.env.POLAR_PRODUCT_ID || ""],
          externalCustomerId: org.id,       // unique per org
          customerEmail: orgEmail,              // real user email, even if shared
          customerName: `${org.name} (${email})`, // for easy identification in Polar dashboard
          seats: org.seatCount || 1,
          successUrl: `https://admin.sayr.io/settings/org/${org.id}/billing?checkout_id={CHECKOUT_ID}`,
          returnUrl: `https://admin.sayr.io/settings/org/${org.id}/billing`,
          metadata: {
            firstUserEmail: email || "",
            firstUserId: userId || "",
            firstUserName: name || "",
          }
        });

        // 4️⃣ Redirect user
        throw redirect({
          href: checkout.url,
        });
      },
    },
  }
});