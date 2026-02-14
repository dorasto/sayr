import type { schema } from "@repo/database";
import { db, getLabels, getReleases, getTasksByUserId } from "@repo/database";
import { ensureCdnUrl } from "@repo/util";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { inArray } from "drizzle-orm";
import { RootProviderInbox } from "@/contexts/ContextInbox";

export const getInboxData = createServerFn({ method: "GET" })
	.inputValidator((data: { account: schema.userType }) => data)
	.handler(async ({ data }) => {
		try {
			const tasks = await getTasksByUserId(data.account.id);
			// Transform organization logos to use CDN URLs
			const transformedTasks = tasks.map((task) => ({
				...task,
				organization: task.organization
					? {
							...task.organization,
							logo: task.organization.logo ? ensureCdnUrl(task.organization.logo) : null,
						}
					: undefined,
			}));
			const organizationIds = Array.from(new Set(tasks.map((task) => task.organizationId)));
			const labelsPromises = organizationIds.map((orgId) => getLabels(orgId));
			const labelsArrays = await Promise.all(labelsPromises);
			const allLabels: schema.labelType[] = labelsArrays.flat();
			const categories = await db.query.category.findMany({
				where: (category) => inArray(category.organizationId, organizationIds),
			});
			const releasesPromises = organizationIds.map((orgId) => getReleases(orgId));
			const releasesArrays = await Promise.all(releasesPromises);
			const allReleases: schema.releaseType[] = releasesArrays.flat();
			return { tasks: transformedTasks, labels: allLabels, categories, releases: allReleases };
		} catch (error) {
			// If it's already a redirect, re-throw it
			if (error && typeof error === "object" && "redirect" in error) {
				throw error;
			}
			throw redirect({ to: "/" });
		}
	});

export const Route = createFileRoute("/(admin)/inbox")({
	loader: async ({ context }) => {
		if (!context.account) {
			throw redirect({ to: "/login" });
		}
		return await getInboxData({ data: { account: context.account } });
	},
	component: InboxLayout,
});

function InboxLayout() {
	const { tasks, labels, categories, releases } = Route.useLoaderData();
	return (
		<RootProviderInbox tasks={tasks} labels={labels} categories={categories} releases={releases}>
			<Outlet />
		</RootProviderInbox>
	);
}
