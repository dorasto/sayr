// Pure slug handling for the view settings sheet (view-settings-sheet.tsx). Kept free of `@/` imports so
// vitest can run it.

/**
 * Normalises slug input as it's typed: lowercase, spaces to hyphens, anything but word characters and hyphens
 * dropped, runs of hyphens collapsed. Leading/trailing hyphens are kept so typing "my-" doesn't fight the user;
 * `resolveSlugUpdate` trims them on save.
 */
export function normalizeViewSlugInput(text: string): string {
	return text
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^\w-]+/g, "")
		.replace(/--+/g, "-");
}

/**
 * The slug to save, or `undefined` when there's nothing to change: the field is empty (a slug can't be cleared —
 * the view would fall back to its id and break existing `?view=` links) or equals the current slug.
 */
export function resolveSlugUpdate(input: string, currentSlug: string | null): string | undefined {
	const slug = normalizeViewSlugInput(input).replace(/^-+|-+$/g, "");
	if (!slug || slug === (currentSlug ?? "")) return undefined;
	return slug;
}

/** Whether another view in the same list is already addressed by `slug` (its slug, or its id). */
export function isViewSlugTaken(
	slug: string,
	views: readonly { id: string; slug: string | null }[],
	viewId: string
): boolean {
	return views.some((view) => view.id !== viewId && (view.slug === slug || view.id === slug));
}
