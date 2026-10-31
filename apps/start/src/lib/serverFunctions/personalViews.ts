import {
	createPersonalView,
	deletePersonalView,
	getPersonalViews,
	reorderPersonalViews,
	updatePersonalView,
} from "@repo/database";
import type { schema } from "@repo/database";
import { createServerFn } from "@tanstack/react-start";
import { requireAccount } from "@/getAccess";

// Personal-view CRUD — direct-serverFn-to-DB, same shape as getLanderData/
// getMyTasks, not the apps/backend REST hop org saved-views go through
// (that layer exists for traceOrgPermissionCheck/plan-limit checks that
// don't apply here — a personal view's only authorization check is "does
// this row belong to the caller", already enforced inside each DB function
// via createdById + isNull(organizationId)). requireAccount() re-verifies the
// session on every call rather than trusting a client-supplied userId. It must
// be the plain function from @/getAccess, not lib/serverFunctions.ts' getAccess:
// that one is itself a server function, and calling a server function from
// inside another fails in production builds ("Server function info not found").
//
// Moved here from apps/start/src/routes/(admin)/home/route.tsx: these are
// now consumed by a globally-mounted store (personal-views-store.ts, read
// on every admin page for the sidebar's Favourites section), not just the
// /home route. Importing createServerFns from a route module into a
// globally-mounted provider would statically pull that whole route's
// module graph into every page's bundle, defeating per-route code
// splitting — hence the move to lib/serverFunctions/, matching the
// existing multi-consumer convention (getConsoleData.ts, etc.).

export const getPersonalViewsAction = createServerFn({ method: "GET" }).handler(async () => {
	const account = await requireAccount();
	return getPersonalViews(account.id);
});

export const createPersonalViewAction = createServerFn({ method: "POST" })
	.validator(
		(data: {
			name: string;
			filterParams: string;
			viewConfig?: schema.savedViewType["viewConfig"];
			slug?: string;
			logo?: string;
		}) => data
	)
	.handler(async ({ data }) => {
		const account = await requireAccount();
		return createPersonalView(account.id, data);
	});

export const updatePersonalViewAction = createServerFn({ method: "POST" })
	.validator(
		(data: {
			viewId: string;
			updates: Partial<{
				name: string;
				filterParams: string;
				viewConfig: schema.savedViewType["viewConfig"];
				slug: string;
				logo: string;
			}>;
		}) => data
	)
	.handler(async ({ data }) => {
		const account = await requireAccount();
		// The input type isn't enforced at runtime and updatePersonalView spreads its argument into
		// the UPDATE, so copy only the allowed columns — otherwise a caller could rewrite
		// createdById/organizationId/position and move the row out of their personal scope.
		const { name, filterParams, viewConfig, slug, logo } = data.updates ?? {};
		const updates: Parameters<typeof updatePersonalView>[2] = {};
		if (typeof name === "string") updates.name = name;
		if (typeof filterParams === "string") updates.filterParams = filterParams;
		if (viewConfig !== undefined) updates.viewConfig = viewConfig;
		if (typeof slug === "string") updates.slug = slug;
		if (typeof logo === "string") updates.logo = logo;
		return updatePersonalView(account.id, data.viewId, updates);
	});

export const deletePersonalViewAction = createServerFn({ method: "POST" })
	.validator((data: { viewId: string }) => data)
	.handler(async ({ data }) => {
		const account = await requireAccount();
		await deletePersonalView(account.id, data.viewId);
		return { success: true };
	});

export const reorderPersonalViewsAction = createServerFn({ method: "POST" })
	.validator((data: { orderedIds: string[] }) => data)
	.handler(async ({ data }) => {
		const account = await requireAccount();
		await reorderPersonalViews(account.id, data.orderedIds);
		return { success: true };
	});
