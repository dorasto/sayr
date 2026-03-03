import type { schema } from "@repo/database";
import { db, getLabels, getReleases, getTasksByUserId } from "@repo/database";
import { ensureCdnUrl } from "@repo/util";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { eq, inArray } from "drizzle-orm";
import { RootProviderInbox } from "@/contexts/ContextInbox";

export const getInboxData = createServerFn({
	method: "GET",
})
	.inputValidator(
		(data: { account: schema.userType }) =>
			data,
	)
	.handler(async ({ data }) => {
		try {
			const tasks =
				await getTasksByUserId(
					data.account.id,
				);

			if (tasks.length === 0) {
				return {
					tasks: [],
					labels: [],
					categories: [],
					releases: [],
				};
			}

			const organizationIds = Array.from(
				new Set(
					tasks.map(
						(task) =>
							task.organizationId,
					),
				),
			);

			// Load org seat info for this user
			const orgs =
				await db.query.organization.findMany({
					where: (org, { inArray }) =>
						inArray(
							org.id,
							organizationIds,
						),
					with: {
						members: {
							where: (
								member,
							) =>
								eq(
									member.userId,
									data.account.id,
								),
						},
					},
				});

			// Determine allowed orgs
			const allowedOrgIds = new Set(
				orgs
					.filter((org) => {
						if (
							org.plan !==
							"pro"
						)
							return true;

						const member =
							org.members[0];

						return (
							member?.seatAssigned ===
							true
						);
					})
					.map((org) => org.id),
			);

			// Filter tasks
			const filteredTasks =
				tasks.filter((task) =>
					allowedOrgIds.has(
						task.organizationId,
					),
				);

			// Transform organization logos
			const transformedTasks =
				filteredTasks.map((task) => ({
					...task,
					organization:
						task.organization
							? {
								...task.organization,
								logo:
									task
										.organization
										.logo
										? ensureCdnUrl(
											task
												.organization
												.logo,
										)
										: null,
							}
							: undefined,
				}));

			const filteredOrgIds =
				Array.from(allowedOrgIds);

			const labelsArrays =
				await Promise.all(
					filteredOrgIds.map(
						(orgId) =>
							getLabels(orgId),
					),
				);

			const allLabels: schema.labelType[] =
				labelsArrays.flat();

			const categories =
				await db.query.category.findMany({
					where: (category) =>
						inArray(
							category.organizationId,
							filteredOrgIds,
						),
				});

			const releasesArrays =
				await Promise.all(
					filteredOrgIds.map(
						(orgId) =>
							getReleases(orgId),
					),
				);

			const allReleases: schema.releaseType[] =
				releasesArrays.flat();

			return {
				tasks: transformedTasks,
				labels: allLabels,
				categories,
				releases: allReleases,
			};
		} catch (error) {
			if (
				error &&
				typeof error === "object" &&
				"redirect" in error
			) {
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
