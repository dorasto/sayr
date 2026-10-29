"use client";

import type { schema } from "@repo/database";
import { useEffect, useMemo, useState } from "react";
import { type BoardDataSource, type BoardOrganizationScope, BoardProvider } from "@/components/board/core/board-data";
import { READ_ONLY_CAPABILITIES } from "@/components/board/core/capabilities";
import type { BoardScope } from "@/components/board/core/scope";
import { DEFAULT_COMBINED_STATE, DEFAULT_FILTER_STATE } from "@/components/board/core/view-config";
import { FilterBuilderContent } from "@/components/board/filter/filter-builder";
import { deserializeFilters, serializeFilters } from "@/components/board/filter/serialization";
import type { FilterState, TaskViewCombinedState } from "@/components/board/filter/types";

interface ViewFilterEditorProps {
	initialFilterParams: string;
	onChange: (newFilterParams: string) => void;
	organizationScope: BoardOrganizationScope;
	labels: readonly schema.labelType[];
	availableUsers: readonly schema.UserSummary[];
	categories: readonly schema.categoryType[];
	tasks: readonly schema.TaskWithLabels[];
	releases: readonly schema.releaseType[];
}

/**
 * An org saved view's filter, edited with the board's own filter builder. The builder reads its field
 * configs and option data from a board, so this mounts a read-only `BoardProvider` over the org's data
 * with a "controlled" scope: the builder's filter changes land in local state, never the URL.
 */
export function ViewFilterEditor({
	initialFilterParams,
	onChange,
	organizationScope,
	labels,
	availableUsers,
	categories,
	tasks,
	releases,
}: ViewFilterEditorProps) {
	// Held locally (not re-derived from the params each render): deserialising mints fresh condition ids.
	const [filters, setFilters] = useState<FilterState>(
		() => deserializeFilters(initialFilterParams) ?? DEFAULT_FILTER_STATE
	);

	// Take the params when they change from outside (e.g. the view was updated elsewhere).
	useEffect(() => {
		setFilters((prev) =>
			serializeFilters(prev) === initialFilterParams
				? prev
				: (deserializeFilters(initialFilterParams) ?? DEFAULT_FILTER_STATE)
		);
	}, [initialFilterParams]);

	const scope = useMemo<BoardScope>(
		() => ({
			key: "org-view-filter-editor",
			persistence: "controlled",
			controlled: {
				state: { ...DEFAULT_COMBINED_STATE, filters },
				onChange: (next: TaskViewCombinedState) => {
					setFilters(next.filters);
					const serialized = serializeFilters(next.filters);
					if (serialized !== initialFilterParams) onChange(serialized);
				},
			},
		}),
		[filters, initialFilterParams, onChange]
	);

	const data = useMemo<BoardDataSource>(
		() => ({ items: tasks, labels, categories, releases, users: availableUsers, organizationScope }),
		[tasks, labels, categories, releases, availableUsers, organizationScope]
	);

	return (
		<div className="rounded-md border px-2 py-1">
			<BoardProvider data={data} capabilities={READ_ONLY_CAPABILITIES} scope={scope}>
				<FilterBuilderContent />
			</BoardProvider>
		</div>
	);
}
