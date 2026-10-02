export type PortalSection = "feedback" | "roadmap" | "changelog" | "activity";

/** The `$orgSlug` route param read off a public portal path (`/orgs/acme/roadmap` -> `acme`), or `""` outside one. */
export function getOrgSlugFromPath(pathname: string): string {
	return pathname.match(/^\/orgs\/([^/]+)/)?.[1] ?? "";
}

/** Drops a trailing slash (but keeps the root path as `/`). */
function trimTrailingSlash(pathname: string): string {
	return pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
}

/** Whether `pathname` is `base` itself or something below it (`/orgs/x/releases` matches `/orgs/x/releases/0.7.0`). */
function isWithin(pathname: string, base: string): boolean {
	return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * Which top-level section of the public portal a path belongs to. Feedback owns the board, post pages
 * (`/orgs/x/123`) and the new post form: anything that is not Roadmap, Changelog or Activity.
 */
export function getPortalSection(pathname: string, orgSlug: string): PortalSection {
	const path = trimTrailingSlash(pathname);
	const base = `/orgs/${orgSlug}`;
	if (isWithin(path, `${base}/roadmap`)) return "roadmap";
	if (isWithin(path, `${base}/releases`)) return "changelog";
	if (isWithin(path, `${base}/activity`)) return "activity";
	return "feedback";
}

/**
 * Pages that bring their own bottom action bar on phones, so the shared tab bar steps aside: a post (sticky vote and
 * comment bar) and the full-screen new post form (sticky post button).
 */
export function hidesMobileTabBar(pathname: string, orgSlug: string): boolean {
	const path = trimTrailingSlash(pathname);
	const base = `/orgs/${orgSlug}`;
	if (isWithin(path, `${base}/new`)) return true;
	return path.startsWith(`${base}/`) && /^\d+$/.test(path.slice(base.length + 1));
}
