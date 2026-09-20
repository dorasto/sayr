import type { Category, Label, Release } from "../types";
import { apiRequest } from "./client";

/**
 * One request per organization per process — the guided prompts (and, for name lookups, the flag path) can want
 * the same list more than once in a single invocation. A failed request isn't remembered, so a retry re-asks.
 */
function perOrg<T>(load: (orgId: string) => Promise<T>): (orgId: string) => Promise<T> {
	const cache = new Map<string, Promise<T>>();
	return (orgId) => {
		let hit = cache.get(orgId);
		if (!hit) {
			hit = load(orgId);
			cache.set(orgId, hit);
			hit.catch(() => cache.delete(orgId));
		}
		return hit;
	};
}

/** `GET /categories` — the same request `sayr categories list` makes. */
export const listCategories = perOrg((orgId) => apiRequest<Category[]>("/categories", { query: { orgId } }));

/** `GET /labels` — the same request `sayr labels list` makes. */
export const listLabels = perOrg((orgId) => apiRequest<Label[]>("/labels", { query: { orgId } }));

/** `GET /releases` (a bare array) — the same request `sayr releases list` makes with no `--status`. */
export const listReleases = perOrg((orgId) => apiRequest<Release[]>("/releases", { query: { orgId } }));
