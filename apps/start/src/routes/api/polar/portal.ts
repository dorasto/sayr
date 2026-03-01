import { createFileRoute, redirect } from "@tanstack/react-router";
import { db, schema } from "@repo/database";
import { eq } from "drizzle-orm";
import { polarClient } from "@repo/auth";

export const Route = createFileRoute("/api/polar/portal")({
  server: {
    handlers: {
      async GET({ request }) {
        const url = new URL(request.url);
        const orgId = url.searchParams.get("orgId");

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

        if (!customerId) {
          throw new Error("Customer not found for org");
        }
        const portal = await polarClient.customerSessions.create({
          customerId: customerId,
          returnUrl: `https://admin.sayr.io/settings/org/${org.id}/billing`,
        });
        // 4️⃣ Redirect user
        throw redirect({
          href: portal.customerPortalUrl,
        });
      },
    },
  }
});