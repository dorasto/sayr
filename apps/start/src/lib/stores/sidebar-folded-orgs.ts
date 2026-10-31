import { useSyncExternalStore } from "react";

// Which org sections the user has folded in the primary sidebar (SAY-104). Every section starts open; folding one
// is remembered per browser in localStorage. Read through useSyncExternalStore with an empty server snapshot, so
// the server and the hydrating client both render every section open, and folded ones close right after.

const STORAGE_KEY = "sidebar-folded-orgs";
const EMPTY: readonly string[] = [];
const listeners = new Set<() => void>();
let folded: readonly string[] | null = null;

function read(): readonly string[] {
	if (folded) return folded;
	try {
		const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
		folded = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
	} catch {
		folded = [];
	}
	return folded;
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function setOrgFolded(orgId: string, isFolded: boolean) {
	const current = read();
	if (current.includes(orgId) === isFolded) return;
	folded = isFolded ? [...current, orgId] : current.filter((id) => id !== orgId);
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(folded));
	} catch {
		// Non-critical: the section still folds for this session.
	}
	for (const listener of listeners) listener();
}

export function useIsOrgFolded(orgId: string): boolean {
	const list = useSyncExternalStore(subscribe, read, () => EMPTY);
	return list.includes(orgId);
}
