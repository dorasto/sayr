/** Route id of the full "new post" form (`/orgs/$orgSlug/new`). */
const NEW_POST_ROUTE = "/orgs/$orgSlug/new" as const;

/**
 * Typed TanStack `Link`/`navigate` props for the new post form, optionally carrying a drafted title:
 * `<Link {...newPostLink(orgSlug, title)}>` or `navigate(newPostLink(orgSlug, title))`.
 */
export function newPostLink(orgSlug: string, title?: string) {
	const trimmed = title?.trim();
	return {
		to: NEW_POST_ROUTE,
		params: { orgSlug },
		search: trimmed ? { title: trimmed } : {},
	};
}
