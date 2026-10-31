import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "..";

/**
 * Fetches all personal (cross-org) saved views owned by a user, by explicit position.
 * (Which of them are pinned lives in the `favourite` table — see ./favourite.ts.)
 *
 * A personal view is a `saved_view` row with `organizationId: null` — distinct
 * from org-scoped views, which always have a concrete `organizationId` and are
 * managed separately (see `packages/database/schema/saveView.schema.ts`).
 *
 * @param userId - The owning user's ID.
 */
export async function getPersonalViews(userId: string): Promise<schema.savedViewType[]> {
	return await db.query.savedView.findMany({
		where: (view) => and(isNull(view.organizationId), eq(view.createdById, userId)),
		orderBy: (view, { asc }) => [asc(view.position)],
	});
}

/**
 * Creates a new personal (cross-org) saved view for a user. Always inserted
 * with `organizationId: null` — this is what distinguishes it from an org-scoped view.
 * New views are appended to the end of the user's list (position = current count).
 *
 * @param userId - The owning user's ID.
 * @param data - View name, serialized filter params, and optional view config/slug/icon.
 */
export async function createPersonalView(
	userId: string,
	data: {
		name: string;
		filterParams: string;
		viewConfig?: schema.savedViewType["viewConfig"];
		slug?: string;
		logo?: string;
	}
): Promise<schema.savedViewType> {
	const existing = await getPersonalViews(userId);

	const [view] = await db
		.insert(schema.savedView)
		.values({
			organizationId: null,
			createdById: userId,
			name: data.name,
			filterParams: data.filterParams,
			viewConfig: data.viewConfig,
			slug: data.slug,
			logo: data.logo,
			position: existing.length,
		})
		.returning();

	if (!view) {
		throw new Error("Failed to create personal view");
	}

	return view;
}

/**
 * Updates a personal saved view. Scoped to `(id, createdById, organizationId IS NULL)`
 * so this can never touch an org-scoped view or another user's personal view, even
 * if a `viewId` collision were somehow attempted.
 *
 * @param userId - The owning user's ID.
 * @param viewId - The view's ID.
 * @param data - Partial view fields to update.
 */
export async function updatePersonalView(
	userId: string,
	viewId: string,
	data: Partial<{
		name: string;
		filterParams: string;
		viewConfig: schema.savedViewType["viewConfig"];
		slug: string;
		logo: string;
	}>
): Promise<schema.savedViewType> {
	const [view] = await db
		.update(schema.savedView)
		.set({ ...data, updatedAt: new Date() })
		.where(
			and(
				eq(schema.savedView.id, viewId),
				eq(schema.savedView.createdById, userId),
				isNull(schema.savedView.organizationId)
			)
		)
		.returning();

	if (!view) {
		throw new Error("Personal view not found or not owned by this user");
	}

	return view;
}

/**
 * Deletes a personal saved view. Scoped identically to {@link updatePersonalView}.
 *
 * @param userId - The owning user's ID.
 * @param viewId - The view's ID.
 */
export async function deletePersonalView(userId: string, viewId: string): Promise<void> {
	const [deleted] = await db
		.delete(schema.savedView)
		.where(
			and(
				eq(schema.savedView.id, viewId),
				eq(schema.savedView.createdById, userId),
				isNull(schema.savedView.organizationId)
			)
		)
		.returning({ id: schema.savedView.id });

	if (!deleted) {
		throw new Error("Personal view not found or not owned by this user");
	}
}

/**
 * Rewrites the `position` of every personal view in `orderedIds` to match its
 * index in the array. Cheap batch rewrite — fine at the scale of a single
 * user's personal view list; no fractional-index scheme needed.
 *
 * @param userId - The owning user's ID.
 * @param orderedIds - The view IDs in their new order.
 */
export async function reorderPersonalViews(userId: string, orderedIds: string[]): Promise<void> {
	await Promise.all(
		orderedIds.map((viewId, index) =>
			db
				.update(schema.savedView)
				.set({ position: index, updatedAt: new Date() })
				.where(
					and(
						eq(schema.savedView.id, viewId),
						eq(schema.savedView.createdById, userId),
						isNull(schema.savedView.organizationId)
					)
				)
		)
	);
}

/**
 * Every shared saved view of the given organizations, in each org's own order — the primary sidebar lists them
 * under each org (SAY-104). Callers pass orgs the user may see (getOrganizations' result).
 *
 * @param orgIds - The organizations whose views to load.
 */
export async function getSavedViewsForOrganizations(orgIds: string[]): Promise<schema.savedViewType[]> {
	if (orgIds.length === 0) return [];
	return await db.query.savedView.findMany({
		where: (view, { inArray }) => inArray(view.organizationId, orgIds),
		orderBy: (view, { asc }) => [asc(view.position), asc(view.createdAt)],
	});
}
