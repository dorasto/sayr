import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { schema } from "@repo/database";
import {
	createPersonalView,
	db,
	deletePersonalView,
	getLabels,
	getOrganizations,
	getPersonalViews,
	getReleases,
	getOrgPermissions,
	getTasksByOrganizationId,
	reorderPersonalViews,
	togglePersonalViewPin,
	updatePersonalView,
	type TeamPermissions,
} from "@repo/database";
import { ensureCdnUrl } from "@repo/util";
import { inArray } from "drizzle-orm";
import { useLanderCommands } from "@/hooks/commands/useLanderCommands";
import { RootProviderLander } from "@/contexts/ContextLander";
import { getAccess } from "@/lib/serverFunctions";
import { seo } from "@/seo";

export const getLanderData = createServerFn({ method: "GET" })
	.inputValidator((data: { account: schema.userType }) => data)
	.handler(async ({ data }) => {
		try {
			// getOrganizations already applies seat-assignment access rules (pro-plan
			// orgs require an assigned seat) — every org it returns is one the user
			// is genuinely allowed to see. This is the same source of truth the
			// sidebar/org-switcher uses (useLayoutData().organizations).
			const orgs = await getOrganizations(data.account.id);

			if (orgs.length === 0) {
				return {
					tasks: [],
					labels: [],
					personalViews: [],
					categories: [],
					releases: [],
					permissionsByOrg: {},
				};
			}

			const orgIds = orgs.map((org) => org.id);

			// Every task in every org the user has access to — not just tasks
			// assigned to them. getTasksByOrganizationId does no visibility
			// filtering of its own (a task's public/private flag governs external
			// visibility, not access among org members), matching what /:orgId/tasks
			// itself shows for a single org.
			const tasksByOrg = await Promise.all(
				orgs.map(async (org) => {
					const orgTasks = await getTasksByOrganizationId(org.id);
					return orgTasks.map((task) => ({
						...task,
						organization: {
							id: org.id,
							name: org.name,
							slug: org.slug,
							shortId: org.shortId,
							logo: org.logo ? ensureCdnUrl(org.logo) : null,
						},
					}));
				})
			);
			const tasks = tasksByOrg.flat();

			const labelsArrays = await Promise.all(orgIds.map((orgId) => getLabels(orgId)));
			const allLabels: schema.labelType[] = labelsArrays.flat();

			const categories = await db.query.category.findMany({
				where: (category) => inArray(category.organizationId, orgIds),
			});

			const releasesArrays = await Promise.all(orgIds.map((orgId) => getReleases(orgId)));
			const allReleases: schema.releaseType[] = releasesArrays.flat();

			// Load per-org permissions for field-level gating in cross-org views
			const permEntries = await Promise.all(
				orgIds.map(async (orgId) => {
					const perms = await getOrgPermissions(data.account.id, orgId);
					return [orgId, perms] as const;
				})
			);
			const permissionsByOrg: Record<string, TeamPermissions> = Object.fromEntries(permEntries);

			const personalViews = await getPersonalViews(data.account.id);

			return {
				tasks,
				labels: allLabels,
				personalViews,
				categories,
				releases: allReleases,
				permissionsByOrg,
			};
		} catch (error) {
			if (error && typeof error === "object" && "redirect" in error) {
				throw error;
			}
			// Log before redirecting — otherwise a real bug here silently becomes an
			// unexplained "/" redirect, which loops forever since "/" sends
			// authenticated users straight back to "/home".
			console.error("[getLanderData] failed, redirecting to /:", error);
			throw redirect({ to: "/" });
		}
	});

// Personal-view CRUD — direct-serverFn-to-DB, same shape as getLanderData/
// getMyTasks, not the apps/backend REST hop org saved-views go through
// (that layer exists for traceOrgPermissionCheck/plan-limit checks that
// don't apply here — a personal view's only authorization check is "does
// this row belong to the caller", already enforced inside each DB function
// via createdById + isNull(organizationId)). getAccess() re-verifies the
// session on every call rather than trusting a client-supplied userId.

export const createPersonalViewAction = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			name: string;
			filterParams: string;
			viewConfig?: schema.savedViewType["viewConfig"];
			slug?: string;
			logo?: string;
		}) => data
	)
	.handler(async ({ data }) => {
		const { account } = await getAccess();
		return createPersonalView(account.id, data);
	});

export const updatePersonalViewAction = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			viewId: string;
			updates: Partial<{
				name: string;
				filterParams: string;
				viewConfig: schema.savedViewType["viewConfig"];
				slug: string;
				logo: string;
				pinned: boolean;
			}>;
		}) => data
	)
	.handler(async ({ data }) => {
		const { account } = await getAccess();
		return updatePersonalView(account.id, data.viewId, data.updates);
	});

export const deletePersonalViewAction = createServerFn({ method: "POST" })
	.inputValidator((data: { viewId: string }) => data)
	.handler(async ({ data }) => {
		const { account } = await getAccess();
		await deletePersonalView(account.id, data.viewId);
		return { success: true };
	});

export const togglePersonalViewPinAction = createServerFn({ method: "POST" })
	.inputValidator((data: { viewId: string; pinned: boolean }) => data)
	.handler(async ({ data }) => {
		const { account } = await getAccess();
		return togglePersonalViewPin(account.id, data.viewId, data.pinned);
	});

export const reorderPersonalViewsAction = createServerFn({ method: "POST" })
	.inputValidator((data: { orderedIds: string[] }) => data)
	.handler(async ({ data }) => {
		const { account } = await getAccess();
		await reorderPersonalViews(account.id, data.orderedIds);
		return { success: true };
	});

export const Route = createFileRoute("/(admin)/home")({
	head: () => ({ meta: seo({ title: "Home" }) }),
	loader: async ({ context }) => {
		if (!context.account) {
			throw redirect({ to: "/auth/login" });
		}
		return await getLanderData({ data: { account: context.account } });
	},
	component: HomeLayout,
});

/** Registers /home's Cmd+K commands — needs to be inside RootProviderLander since useLanderCommands reads useLanderData(). */
function LanderCommandRegistrar() {
	useLanderCommands();
	return null;
}

function HomeLayout() {
	const { tasks, labels, personalViews, categories, releases, permissionsByOrg } = Route.useLoaderData();
	return (
		<RootProviderLander
			tasks={tasks}
			labels={labels}
			personalViews={personalViews}
			categories={categories}
			releases={releases}
			permissionsByOrg={permissionsByOrg}
		>
			<LanderCommandRegistrar />
			<Outlet />
		</RootProviderLander>
	);
}
