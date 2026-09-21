import type { TeamPermissions } from "@repo/database";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import type { LanderData } from "@/lib/board/apply-lander-event";

interface ContextType extends LanderData {
	permissionsByOrg: Record<string, TeamPermissions>;
	/**
	 * Race-free update of the whole live data set. The updater receives the latest
	 * value, not the one this component last rendered, so two calls before a
	 * re-render (SSE events, bulk actions) compose instead of overwriting each other.
	 * Never write back a list captured from a render — always derive from `prev`.
	 */
	updateLanderData: (updater: (prev: LanderData) => LanderData) => void;
	/** `updateLanderData` narrowed to the task list; return `prev` unchanged to skip the update. */
	updateTasks: (updater: (prev: LanderData["tasks"]) => LanderData["tasks"]) => void;
}

const LanderContext = createContext<ContextType | undefined>(undefined);

function isSameSeed(a: LanderData, b: LanderData) {
	return a.tasks === b.tasks && a.labels === b.labels && a.categories === b.categories && a.releases === b.releases;
}

/**
 * Owns the board's live data. The route loader's result is the SEED, not a
 * default: whenever the loader hands over new arrays (re-entering /home, a
 * router.invalidate() resync after an SSE gap, a same-route navigation) they
 * replace whatever live state was built up, so the store can never stay stuck on
 * an older snapshot. The state lives in this component on purpose — it is
 * rebuilt from the loader on every mount, and can't be resurrected from a
 * query-cache entry that missed every event while the user was on another page.
 *
 * The four arrays must be referentially stable between renders (loader data is);
 * a caller that recreated them every render would re-seed forever.
 */
export function RootProviderLander({
	children,
	tasks,
	labels,
	categories,
	releases,
	permissionsByOrg,
}: {
	children: ReactNode;
	tasks: ContextType["tasks"];
	labels: ContextType["labels"];
	categories: ContextType["categories"];
	releases: ContextType["releases"];
	permissionsByOrg: ContextType["permissionsByOrg"];
}) {
	const [store, setStore] = useState<{ seededFrom: LanderData; data: LanderData }>(() => {
		const seed: LanderData = { tasks, labels, categories, releases };
		return { seededFrom: seed, data: seed };
	});

	// "Adjusting state while rendering" (react.dev: you might not need an effect): re-seed
	// synchronously so children never render a frame of the superseded snapshot.
	const incoming: LanderData = { tasks, labels, categories, releases };
	let current = store;
	if (!isSameSeed(store.seededFrom, incoming)) {
		current = { seededFrom: incoming, data: incoming };
		setStore(current);
	}

	const updateLanderData = useCallback((updater: (prev: LanderData) => LanderData) => {
		setStore((prev) => {
			const data = updater(prev.data);
			return data === prev.data ? prev : { ...prev, data };
		});
	}, []);

	const updateTasks = useCallback(
		(updater: (prev: LanderData["tasks"]) => LanderData["tasks"]) => {
			updateLanderData((prev) => {
				const nextTasks = updater(prev.tasks);
				return nextTasks === prev.tasks ? prev : { ...prev, tasks: nextTasks };
			});
		},
		[updateLanderData]
	);

	const value = useMemo<ContextType>(
		() => ({ ...current.data, permissionsByOrg, updateLanderData, updateTasks }),
		[current.data, permissionsByOrg, updateLanderData, updateTasks]
	);

	return <LanderContext.Provider value={value}>{children}</LanderContext.Provider>;
}

export function useLanderData() {
	const context = useContext(LanderContext);
	if (context === undefined) {
		throw new Error("useLanderData must be used within a RootProviderLander");
	}
	return context;
}
