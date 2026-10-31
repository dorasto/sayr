import { ensureCdnUrl } from "@repo/util";
import { and, asc, eq, inArray, isNull, max, or, sql } from "drizzle-orm";
import { db, schema } from "..";

/** The org a favourited org view belongs to — enough for the sidebar to badge and link it. */
export interface FavouriteOrganization {
	id: string;
	slug: string;
	name: string;
	logo: string | null;
}

/** A favourite with what it points at: a saved view, plus its org when it's an org's shared view. */
export interface FavouriteWithTarget {
	id: string;
	position: number;
	view: schema.savedViewType;
	/** Null for a personal view. */
	organization: FavouriteOrganization | null;
}

/**
 * The saved views a user may favourite: their own personal views, and the shared views of orgs they belong to
 * (on a Pro org, only with a seat, matching getOrganizations). Used to both list and add favourites, so a
 * favourite of an org the user has left, or lost their seat in, quietly stops showing.
 */
function viewAccessibleTo(userId: string) {
	return or(
		and(isNull(schema.savedView.organizationId), eq(schema.savedView.createdById, userId)),
		sql`exists (
			select 1 from ${schema.member}
			join ${schema.organization} on ${schema.organization.id} = ${schema.member.organizationId}
			where ${schema.member.organizationId} = ${schema.savedView.organizationId}
				and ${schema.member.userId} = ${userId}
				and (coalesce(${schema.organization.plan}, 'free') <> 'pro' or ${schema.member.seatAssigned})
		)`
	);
}

/** A user's favourites in their own order, each with its saved view (and org, for org views). */
export async function getFavourites(userId: string): Promise<FavouriteWithTarget[]> {
	const rows = await db
		.select({
			id: schema.favourite.id,
			position: schema.favourite.position,
			view: schema.savedView,
			organization: {
				id: schema.organization.id,
				slug: schema.organization.slug,
				name: schema.organization.name,
				logo: schema.organization.logo,
			},
		})
		.from(schema.favourite)
		.innerJoin(schema.savedView, eq(schema.savedView.id, schema.favourite.savedViewId))
		.leftJoin(schema.organization, eq(schema.organization.id, schema.savedView.organizationId))
		.where(and(eq(schema.favourite.userId, userId), viewAccessibleTo(userId)))
		.orderBy(asc(schema.favourite.position), asc(schema.favourite.createdAt));

	return rows.map((row) => ({
		...row,
		organization: row.organization
			? { ...row.organization, logo: row.organization.logo ? ensureCdnUrl(row.organization.logo) : null }
			: null,
	}));
}

/**
 * Adds a saved view to the end of the user's favourites. A no-op if it's already there; throws if the user
 * can't see the view (another user's personal view, or an org they aren't a member of).
 */
export async function addSavedViewFavourite(userId: string, savedViewId: string): Promise<void> {
	const [view] = await db
		.select({ id: schema.savedView.id })
		.from(schema.savedView)
		.where(and(eq(schema.savedView.id, savedViewId), viewAccessibleTo(userId)));
	if (!view) throw new Error("Saved view not found");

	const [last] = await db
		.select({ position: max(schema.favourite.position) })
		.from(schema.favourite)
		.where(eq(schema.favourite.userId, userId));

	await db
		.insert(schema.favourite)
		.values({ userId, kind: "saved_view", savedViewId, position: (last?.position ?? -1) + 1 })
		.onConflictDoNothing();
}

/** Removes a saved view from the user's favourites (a no-op if it isn't one). */
export async function removeSavedViewFavourite(userId: string, savedViewId: string): Promise<void> {
	await db
		.delete(schema.favourite)
		.where(and(eq(schema.favourite.userId, userId), eq(schema.favourite.savedViewId, savedViewId)));
}

/**
 * Saves the user's order of their favourites: each favourite in `orderedIds` (favourite ids) gets its index as
 * its position, in one statement. Scoped to the user's own rows.
 */
export async function reorderFavourites(userId: string, orderedIds: string[]): Promise<void> {
	if (orderedIds.length === 0) return;
	const cases = sql.join(
		orderedIds.map((id, index) => sql`when ${schema.favourite.id} = ${id} then ${index}`),
		sql` `
	);
	await db
		.update(schema.favourite)
		.set({ position: sql`(case ${cases} end)::integer` })
		.where(and(eq(schema.favourite.userId, userId), inArray(schema.favourite.id, orderedIds)));
}
