import { schema } from "@repo/database";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";

export const getAdminOrganization = createServerFn({ method: "GET" }).handler(async (c) => {
	const { getAccess } = await import("../serverFunctions");
	const { db, getOrganization, getLabels } = await import("@repo/database");
	try {
		const { account } = await getAccess();
		if (!c.data) {
			throw redirect({ to: "/admin" });
		}
		const organization = await getOrganization(c.data.orgId, account.id);
		if (!organization) {
			throw redirect({ to: "/admin" });
		}
		const labels = await getLabels(organization.id);
		const views = await db
			.select()
			.from(schema.savedView)
			.where(eq(schema.savedView.organizationId, organization.id));
		const categories = await db.query.category.findMany({
			where: (category) => eq(category.organizationId, organization.id),
		});
		return { organization, labels, views, categories };
	} catch (error) {
		// If it's already a redirect, re-throw it
		if (error && typeof error === "object" && "redirect" in error) {
			throw error;
		}
		throw redirect({ to: "/admin" });
	}
});
