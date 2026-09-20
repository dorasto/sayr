import {
	createPersonalView,
	deletePersonalView,
	getPersonalViews,
	reorderPersonalViews,
	togglePersonalViewPin,
	updatePersonalView,
} from "@repo/database";
import type { schema } from "@repo/database";
import { createServerFn } from "@tanstack/react-start";
import { getAccess } from "@/lib/serverFunctions";

// Personal-view CRUD — direct-serverFn-to-DB, same shape as getLanderData/
// getMyTasks, not the apps/backend REST hop org saved-views go through
// (that layer exists for traceOrgPermissionCheck/plan-limit checks that
// don't apply here — a personal view's only authorization check is "does
// this row belong to the caller", already enforced inside each DB function
// via createdById + isNull(organizationId)). getAccess() re-verifies the
// session on every call rather than trusting a client-supplied userId.
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
	const { account } = await getAccess();
	return getPersonalViews(account.id);
});

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
