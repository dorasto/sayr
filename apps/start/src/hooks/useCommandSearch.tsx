"use client";

import { formatTaskKey } from "@repo/util";
import { IconCircleFilled } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { statusConfig } from "@/components/tasks/shared/config";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { searchTasks, type TaskSearchResult } from "@/lib/fetches/searchTasks";
import type { CommandItem } from "@/types/command";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

/**
 * Hook that provides debounced server-side task search for the command palette.
 * Transforms search results into CommandItem format for rendering.
 *
 * @param query - Current search input value
 * @param isOpen - Whether the command palette is open (skip search when closed)
 * @returns Object with search results as CommandItems and loading state
 */
export function useCommandSearch(query: string, isOpen: boolean) {
	const navigate = useNavigate();
	const [results, setResults] = useState<CommandItem[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);

	const transformResult = useCallback(
		(result: TaskSearchResult): CommandItem => {
			const statusConf = statusConfig[result.status as keyof typeof statusConfig];
			return {
				id: `search-task-${result.id}`,
				label: result.title || "Untitled task",
				icon: statusConf ? (
					statusConf.icon("h-4 w-4 shrink-0")
				) : (
					<IconCircleFilled className="h-4 w-4 shrink-0 opacity-40" />
				),
				value: `${result.title || ""} ${result.organizationName || ""} ${result.shortId || ""}`,
				keywords: `task issue ${result.shortId || ""} ${result.organizationName || ""}`,
				metadata: (
					<span className="flex items-center gap-1.5">
						{result.organizationName && (
							<span className="text-xs text-muted-foreground bg-accent px-1.5 py-0.5 rounded">
								{result.organizationName}
							</span>
						)}
						{result.shortId != null && (
							<span className="text-xs text-muted-foreground font-mono">
								{result.organizationShortId
									? formatTaskKey(result.organizationShortId, result.shortId)
									: result.shortId}
							</span>
						)}
					</span>
				),
				action: () => {
					navigate({
						to: "/$orgId/tasks/$taskShortId",
						params: {
							orgId: result.organizationId,
							taskShortId: String(result.shortId || "0"),
						},
					});
				},
			};
		},
		[navigate]
	);

	useEffect(() => {
		// Clear results when palette closes or the debounced query is too short
		if (!isOpen || debouncedQuery.trim().length < MIN_QUERY_LENGTH) {
			setResults([]);
			setIsSearching(false);
			return;
		}

		let cancelled = false;
		setIsSearching(true);

		searchTasks(debouncedQuery)
			.then((data) => {
				if (!cancelled) setResults(data.map(transformResult));
			})
			.catch(() => {
				// Silently fail on network errors / aborts
				if (!cancelled) setResults([]);
			})
			.finally(() => {
				if (!cancelled) setIsSearching(false);
			});

		return () => {
			cancelled = true;
		};
	}, [debouncedQuery, isOpen, transformResult]);

	return { results, isSearching };
}
