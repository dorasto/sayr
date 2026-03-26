import { db, getIssueTemplates, getLabels, getOrganization, getReleases, schema } from "@repo/database";
import { isRedirect, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";

export const getAdminOrganization = createServerFn({ method: "GET" })
	.inputValidator((data: { account: schema.userType; orgId: string, permissions: schema.TeamPermissions }) => data)
	.handler(async ({ data }) => {
		const { account, orgId, permissions } = data;
		try {
			if (!orgId) {
				throw redirect({ to: "/" });
			}
			const organization = await getOrganization(orgId, account.id, { blockOrgUnseated: true });
			if (!organization) {
				// Distinguish between org not existing and user not being a member
				const bareOrg = await db.query.organization.findFirst({
					where: (org) => eq(org.id, orgId),
					columns: { slug: true },
				});
				if (!bareOrg) {
					throw redirect({ to: "/" });
				}
				throw redirect({ href: `https://${bareOrg.slug}.${process.env.VITE_ROOT_DOMAIN}` });
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
			return { organization, labels, views, categories, issueTemplates, releases, permissions };
		} catch (error) {
			// If it's already a redirect, re-throw it
			if (isRedirect(error)) {
				throw error;
			}
			throw redirect({ to: "/" });
		}
	});
