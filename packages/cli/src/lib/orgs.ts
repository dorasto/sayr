import type { Organization } from "../types";
import { apiRequest } from "./client";

let cache: Organization[] | null = null;

/** Fetches `/me/organizations` once per process invocation and caches the result. */
export async function listOrganizationsCached(): Promise<Organization[]> {
	if (!cache) {
		cache = await apiRequest<Organization[]>("/organizations");
	}
	return cache;
}

/**
 * Resolves an org slug/id to its display short id (e.g. "SAY"), used to build
 * task keys with `formatTaskKey` from `@repo/util`. Returns null if the ref
 * doesn't match any organization the caller belongs to.
 */
export async function resolveOrgShortId(orgRef: string): Promise<string | null> {
	const organizations = await listOrganizationsCached();
	const match = organizations.find((org) => org.slug === orgRef || org.id === orgRef);
	return match?.shortId ?? null;
}
