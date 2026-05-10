import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { searchOrgTasks, type OrgTaskSearchResult } from "@/lib/fetches/searchTasks";
import type { MentionContext } from "./useMentionUsers";

/**
 * Hook that provides mentionable tasks for the ProseKit Editor # mentions.
 *
 * Reads `mentionContext` (orgId) from the global state management store,
 * fetches tasks from the backend using the org task search endpoint, and supports async search.
 *
 * Also maintains a cumulative cache of all seen tasks so `MentionView`
 * can always resolve task mention chips (even for tasks not in the current search).
 */
export function useMentionTasks() {
	const { value: mentionContext } = useStateManagement<MentionContext | null>("mentionContext", null);
	const orgId = mentionContext?.orgId;

	const [searchQuery, setSearchQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");

	useEffect(() => {
		if (searchQuery.length === 0) {
			setDebouncedQuery("");
			return;
		}
		const timer = setTimeout(() => {
			setDebouncedQuery(searchQuery);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	const seenTasksRef = useRef<Map<string, OrgTaskSearchResult>>(new Map());

	const searchQueryResult = useQuery<OrgTaskSearchResult[]>({
		queryKey: ["mentionTasks", orgId, "search", debouncedQuery],
		queryFn: () => searchOrgTasks(orgId!, debouncedQuery, 20),
		enabled: !!orgId,
		staleTime: debouncedQuery ? 1000 * 60 * 2 : 1000 * 60 * 5,
		gcTime: 1000 * 60 * 10,
		placeholderData: keepPreviousData,
	});

	const searchTasks = searchQueryResult.data;

	if (searchTasks) {
		for (const t of searchTasks) {
			if (!seenTasksRef.current.has(t.id)) {
				seenTasksRef.current.set(t.id, t);
			}
		}
	}

	const displayTasks = useMemo(() => {
		return searchTasks ?? [];
	}, [searchTasks]);

	const loading = searchQueryResult.isFetching;

	const getTaskById = useCallback(
		(taskId: string): OrgTaskSearchResult | undefined => {
			return seenTasksRef.current.get(taskId);
		},
		[],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: needs to recompute when fetched data changes
	const allSeenTasks = useMemo(() => {
		return Array.from(seenTasksRef.current.values());
	}, [searchTasks]);

	return {
		tasks: displayTasks,
		loading,
		setSearchQuery,
		getTaskById,
		allSeenTasks,
		hasContext: !!orgId,
	};
}
