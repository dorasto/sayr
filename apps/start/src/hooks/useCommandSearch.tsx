"use client";

import { IconCircleFilled } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { searchTasks, type TaskSearchResult } from "@/lib/fetches/searchTasks";
import type { CommandItem } from "@/types/command";
import { statusConfig } from "@/components/tasks/shared/config";

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
	const abortControllerRef = useRef<AbortController | null>(null);
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
							<span className="text-xs text-muted-foreground font-mono">#{result.shortId}</span>
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
		[navigate],
	);

	useEffect(() => {
		// Clear results when palette closes or query is too short
		if (!isOpen || query.trim().length < MIN_QUERY_LENGTH) {
			setResults([]);
			setIsSearching(false);
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
				debounceTimerRef.current = null;
			}
			return;
		}

		setIsSearching(true);

		// Cancel any pending request
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}

		// Clear previous debounce
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		debounceTimerRef.current = setTimeout(async () => {
			try {
				const data = await searchTasks(query);
				setResults(data.map(transformResult));
			} catch {
				// Silently fail on network errors / aborts
				setResults([]);
			} finally {
				setIsSearching(false);
			}
		}, DEBOUNCE_MS);

		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, [query, isOpen, transformResult]);

	return { results, isSearching };
}
