import { db, getOrganization, getTasksByOrganizationId, type schema } from "@repo/database";
import { isRedirect, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";

export const getAdminOrganizationTasks = createServerFn({ method: "GET" })
	.inputValidator((data: { account: schema.userType; orgId: string }) => data)
	.handler(async ({ data }) => {
		const { account, orgId } = data;
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
			const tasks = await getTasksByOrganizationId(organization.id);
			return { tasks };
		} catch (error) {
			// If it's already a redirect, re-throw it
			if (isRedirect(error)) {
				throw error;
			}
			throw redirect({ to: "/" });
		}
	});
