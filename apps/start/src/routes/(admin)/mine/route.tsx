import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { RootProviderMyTasks } from "@/contexts/ContextMine";

import type { schema } from "@repo/database";
import { db, getLabels, getTasksByUserId, getReleases, getOrgPermissions, type TeamPermissions } from "@repo/database";
import { ensureCdnUrl } from "@repo/util";
import { createServerFn } from "@tanstack/react-start";
import { eq, inArray } from "drizzle-orm";
import { seo } from "@/seo";

export const getMyTasks = createServerFn({ method: "GET" })
	.inputValidator((data: { account: schema.userType }) => data)
	.handler(async ({ data }) => {
		try {
			const tasks = await getTasksByUserId(
				data.account.id,
			);

			if (tasks.length === 0) {
				return {
					tasks: [],
					labels: [],
					views: [],
					categories: [],
					releases: [],
					permissionsByOrg: {},
				};
			}

			const organizationIds = Array.from(
				new Set(
					tasks.map(
						(task) => task.organizationId,
					),
				),
			);

			// Load orgs with seat info for this user
			const orgs = await db.query.organization.findMany({
				where: (org, { inArray }) =>
					inArray(org.id, organizationIds),
				with: {
					members: {
						where: (member) =>
							eq(
								member.userId,
								data.account.id,
							),
					},
				},
			});

			// Build map of orgId -> allowed
			const allowedOrgIds = new Set(
				orgs
					.filter((org) => {
						if (org.plan !== "pro")
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

			// Filter tasks based on seat rules
			const filteredTasks = tasks.filter(
				(task) =>
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

			const filteredOrgIds = Array.from(
				allowedOrgIds,
			);

			const labelsArrays =
				await Promise.all(
					filteredOrgIds.map((orgId) =>
						getLabels(orgId),
					),
				);

			const allLabels: schema.labelType[] =
				labelsArrays.flat();

			const views =
				await db.query.savedView.findMany({
					where: (view) =>
						inArray(
							view.organizationId,
							filteredOrgIds,
						),
				});

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
					filteredOrgIds.map((orgId) =>
						getReleases(orgId),
					),
				);

			const allReleases: schema.releaseType[] =
				releasesArrays.flat();

			// Load per-org permissions for field-level gating in cross-org views
			const permEntries = await Promise.all(
				filteredOrgIds.map(async (orgId) => {
					const perms = await getOrgPermissions(data.account.id, orgId);
					return [orgId, perms] as const;
				}),
			);
			const permissionsByOrg: Record<string, TeamPermissions> = Object.fromEntries(permEntries);

			return {
				tasks: transformedTasks,
				labels: allLabels,
				views,
				categories,
				releases: allReleases,
				permissionsByOrg,
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

export const Route = createFileRoute("/(admin)/mine")({
	head: () => ({ meta: seo({ title: "My Tasks" }) }),
	loader: async ({ context }) => {
		if (!context.account) {
			throw redirect({ to: "/auth/login" });
		}
		return await getMyTasks({ data: { account: context.account } });
	},
	component: MineLayout,
});

function MineLayout() {
	const { tasks, labels, views, categories, releases, permissionsByOrg } = Route.useLoaderData();
	return (
		<RootProviderMyTasks
			tasks={tasks}
			labels={labels}
			views={views}
			categories={categories}
			releases={releases}
			permissionsByOrg={permissionsByOrg}
		>
			<Outlet />
		</RootProviderMyTasks>
	);
}
