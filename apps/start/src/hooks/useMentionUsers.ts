import type { schema } from "@repo/database";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { searchMentionUsers } from "@/lib/fetches/mention";

export interface MentionContext {
	orgId: string;
}

/**
 * Hook that provides mentionable users for the ProseKit Editor.
 *
 * Reads `mentionContext` (orgId) from the global state management store,
 * fetches org members from the backend, and supports async search.
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

	// Initial load: get the first batch of org members (no query filter)
	const initialQuery = useQuery<schema.UserSummary[]>({
		queryKey: ["mentionUsers", orgId, "initial"],
		queryFn: () => searchMentionUsers(orgId!, undefined, 20),
		enabled: !!orgId,
		staleTime: 1000 * 60 * 5, // 5 min
		gcTime: 1000 * 60 * 10,
	});

	// Search query: fires after debounce delay, only when query is >= 2 chars.
	// Shorter queries are handled by client-side filtering of the initial load.
	const searchQueryResult = useQuery<schema.UserSummary[]>({
		queryKey: ["mentionUsers", orgId, "search", debouncedQuery],
		queryFn: () => searchMentionUsers(orgId!, debouncedQuery, 20),
		enabled: !!orgId && debouncedQuery.length >= 2,
		staleTime: 1000 * 60 * 2, // 2 min
		gcTime: 1000 * 60 * 5,
	});

	// Update the cumulative cache whenever we get new data
	const baseUsers = initialQuery.data ?? [];
	const searchUsers = searchQueryResult.data;

	for (const u of baseUsers) {
		if (!seenUsersRef.current.has(u.id)) {
			seenUsersRef.current.set(u.id, u);
		}
	}
	if (searchUsers) {
		for (const u of searchUsers) {
			if (!seenUsersRef.current.has(u.id)) {
				seenUsersRef.current.set(u.id, u);
			}
		}
	}

	// The users to display in the autocomplete popover:
	// - If a debounced search has returned results, show those
	// - Otherwise, use initial load (UserMenu does its own client-side filtering)
	const displayUsers = useMemo(() => {
		if (debouncedQuery && searchUsers) {
			return searchUsers;
		}
		return baseUsers;
	}, [debouncedQuery, searchUsers, baseUsers]);

	// Show loading when:
	// 1. A debounced search is actively fetching, OR
	// 2. The user has typed 2+ chars but debounce hasn't fired yet (query differs from debouncedQuery)
	const isWaitingForDebounce = searchQuery.length >= 2 && searchQuery !== debouncedQuery;
	const loading = isWaitingForDebounce || (debouncedQuery.length >= 2 ? searchQueryResult.isFetching : initialQuery.isLoading);

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
