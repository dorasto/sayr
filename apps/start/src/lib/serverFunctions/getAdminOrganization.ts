import { db, getIssueTemplates, getLabels, getOrganization, getReleases, schema } from "@repo/database";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";

export const getAdminOrganization = createServerFn({ method: "GET" })
	.inputValidator((data: { account: schema.userType; orgId: string }) => data)
	.handler(async ({ data }) => {
		const { account, orgId } = data;
		try {
			if (!orgId) {
				throw redirect({ to: "/" });
			}
			const organization = await getOrganization(orgId, account.id, { blockOrgUnseated: true });
			if (!organization) {
				throw redirect({ to: "/" });
			}
			const labels = await getLabels(organization.id);
			const views = await db
				.select()
				.from(schema.savedView)
				.where(eq(schema.savedView.organizationId, organization.id));
			const categories = await db.query.category.findMany({
				where: (category) => eq(category.organizationId, organization.id),
			});
			const issueTemplates = await getIssueTemplates(organization.id);
			const releases = await getReleases(organization.id);
			return { organization, labels, views, categories, issueTemplates, releases };
		} catch (error) {
			// console.log("🚀 ~ error:", error);
			// If it's already a redirect, re-throw it
			if (error && typeof error === "object" && "redirect" in error) {
				throw error;
			}
			throw redirect({ to: "/" });
		}
	});
