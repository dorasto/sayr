import { db, getOrganization, getTaskByShortId } from "@repo/database";
import { isRedirect, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { requireAccount } from "@/getAccess";

export const getAdminOrganizationTask = createServerFn({ method: "GET" })
	.validator((data: { orgId: string; taskShortId: number }) => data)
	.handler(async ({ data }) => {
		const { orgId, taskShortId } = data;
		const account = await requireAccount();
		try {
			if (!orgId) {
				console.log("🚀 ~ orgId:", orgId);
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
				// Org exists but user is not a member — send to the public task page
				throw redirect({ href: `https://${bareOrg.slug}.${process.env.VITE_ROOT_DOMAIN}/${taskShortId}` });
			}
			const task = await getTaskByShortId(organization.id, taskShortId);
			if (!task) {
				console.log("🚀 ~ task:", task);
				//@ts-expect-error should be fine
				throw redirect({ to: `/admin/${organization.id}/tasks` });
			}
			return {
				task,
				orgName: organization.name,
				orgSlug: organization.slug,
				orgLogo: organization.logo,
				orgShortId: organization.shortId,
			};
		} catch (error) {
			// If it's already a redirect, re-throw it
			if (isRedirect(error)) {
				throw error;
			}
			throw redirect({ to: "/" });
		}
	});
