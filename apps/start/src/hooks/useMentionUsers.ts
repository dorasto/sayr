import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { searchGlobalUsers } from "@/lib/fetches/mention";

export interface MentionContext {
	orgId: string;
	taskId?: string;
	releaseId?: string;
}

/**
 * Hook that provides mentionable users for the ProseKit Editor.
 *
 * Reads `mentionContext` (orgId, taskId, releaseId) from the global state management store,
 * fetches users from the backend using the global search endpoint, and supports async search.
 *
 * Page-level components set `mentionContext` via `useStateManagement`,
 * and the Editor consumes this hook internally.
 *
 * Also maintains a cumulative cache of all seen users so `MentionView`
 * can always resolve mention chips (even for users not in the current search).
 */
export function useMentionUsers(seedUsers?: schema.UserSummary[]) {
	const { value: mentionContext } = useStateManagement<MentionContext | null>("mentionContext", null);
	const orgId = mentionContext?.orgId;
	const taskId = mentionContext?.taskId;

	const [searchQuery, setSearchQuery] = useState("");

	// Debounced version of searchQuery — only this value triggers network fetches.
	// The raw searchQuery still drives client-side filtering for instant feedback.
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

	// Cumulative user cache — grows as we see more users from searches.
	// Keyed by user ID for deduplication.
	const seenUsersRef = useRef<Map<string, schema.UserSummary>>(new Map());

	// Seed with any users passed in as props (e.g., from task assignees)
	if (seedUsers) {
		for (const u of seedUsers) {
			if (!seenUsersRef.current.has(u.id)) {
				seenUsersRef.current.set(u.id, u);
			}
		}
	}

	// Single query to the global search endpoint
	// Handles context-aware ordering (task participants > org members > all users)
	const searchQueryResult = useQuery<schema.UserSummary[]>({
		queryKey: ["mentionUsers", orgId, taskId, "search", debouncedQuery],
		queryFn: () => searchGlobalUsers({
			query: debouncedQuery || undefined,
			orgId,
			taskId,
			limit: 20,
		}),
		enabled: !!orgId,
		staleTime: debouncedQuery ? 1000 * 60 * 2 : 1000 * 60 * 5, // 2 min for search, 5 min for initial
		gcTime: 1000 * 60 * 10,
		placeholderData: keepPreviousData,
	});

	// Update the cumulative cache whenever we get new data
	const searchUsers = searchQueryResult.data;

	if (searchUsers) {
		for (const u of searchUsers) {
			if (!seenUsersRef.current.has(u.id)) {
				seenUsersRef.current.set(u.id, u);
			}
		}
	}

	// The users to display in the autocomplete popover
	const displayUsers = useMemo(() => {
		return searchUsers ?? [];
	}, [searchUsers]);

	// Show loading when a search is actively fetching
	const loading = searchQueryResult.isFetching;

	// Look up a user by ID from the cumulative cache (for MentionView chips)
	const getUserById = useCallback(
		(userId: string): schema.UserSummary | undefined => {
			return seenUsersRef.current.get(userId);
		},
		[],
	);

	// All users we've ever seen (for MentionView)
	// biome-ignore lint/correctness/useExhaustiveDependencies: needs to recompute when fetched data changes
	const allSeenUsers = useMemo(() => {
		return Array.from(seenUsersRef.current.values());
	}, [displayUsers, seedUsers]);

	return {
		/** Users to show in the autocomplete dropdown */
		users: displayUsers,
		/** Whether a fetch is in progress */
		loading,
		/** Set the search query (called by UserMenu onQueryChange) */
		setSearchQuery,
		/** Look up a single user by ID (for MentionView) */
		getUserById,
		/** All users ever fetched/seen — for MentionView chip rendering */
		allSeenUsers,
		/** Whether mention context is available */
		hasContext: !!orgId,
	};
}
