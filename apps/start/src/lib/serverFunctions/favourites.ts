import { addSavedViewFavourite, getFavourites, removeSavedViewFavourite, reorderFavourites } from "@repo/database";
import { createServerFn } from "@tanstack/react-start";
import { requireAccount } from "@/getAccess";

// The sidebar's Favourites (SAY-104), per user. Same direct-serverFn-to-DB shape as personalViews.ts: every DB
// function is scoped to the session's user, and adding one checks the user can see the view (their own
// personal view, or a view of an org they belong to).

export const getFavouritesAction = createServerFn({ method: "GET" }).handler(async () => {
	const account = await requireAccount();
	return getFavourites(account.id);
});

export const addSavedViewFavouriteAction = createServerFn({ method: "POST" })
	.validator((data: { savedViewId: string }) => data)
	.handler(async ({ data }) => {
		const account = await requireAccount();
		await addSavedViewFavourite(account.id, data.savedViewId);
		return getFavourites(account.id);
	});

export const removeSavedViewFavouriteAction = createServerFn({ method: "POST" })
	.validator((data: { savedViewId: string }) => data)
	.handler(async ({ data }) => {
		const account = await requireAccount();
		await removeSavedViewFavourite(account.id, data.savedViewId);
		return { success: true };
	});

export const reorderFavouritesAction = createServerFn({ method: "POST" })
	.validator((data: { orderedIds: string[] }) => data)
	.handler(async ({ data }) => {
		const account = await requireAccount();
		await reorderFavourites(account.id, data.orderedIds);
		return { success: true };
	});
