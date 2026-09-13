import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { BOARD_STATUSES, getMeRpc, listReleasesRpc, listTasksRpc, STATUS_LABELS, type Task } from "../shared/task";
import { BoardColumn } from "./board-column";
import { BoardHeader, type ReleaseOption } from "./board-header";
import { TaskDetailSheet } from "./task-detail-sheet";

/** A release id shared across orgs would be a coincidence, not a real match — every option is scoped to one org's release list. */
const NO_RELEASE = "__no-release__";

interface SelectedTask {
	taskId: string;
	orgSlug: string;
}

/**
 * The plugin's sidebar surface: a status-column board of every task across
 * every org the CLI login can see. Composition root only — filtering state
 * lives here, but the header, columns/cards, and detail sheet are each their
 * own file (`board-header.tsx`, `board-column.tsx` + `task-card.tsx`,
 * `task-detail-sheet.tsx`).
 */
export function SayrBoard({ theme, layout, navigation }: PluginSurfaceProps) {
	const [selected, setSelected] = useState<SelectedTask | null>(null);
	const [hiddenOrgs, setHiddenOrgs] = useState<Set<string>>(new Set());
	const [hiddenPriorities, setHiddenPriorities] = useState<Set<Task["priority"]>>(new Set());
	const [hiddenReleases, setHiddenReleases] = useState<Set<string>>(new Set());
	const [onlyMine, setOnlyMine] = useState(false);
	const [query, setQuery] = useState("");
	const [bodyWidth, setBodyWidth] = useState<number | null>(null);
	const [panelWidth, setPanelWidth] = useState<number | null>(null);

	const listTasks = useRpc(listTasksRpc);
	const listReleasesFn = useRpc(listReleasesRpc);
	const getMeFn = useRpc(getMeRpc);
	const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useQuery({
		queryKey: ["sayr", "tasks"],
		queryFn: () => listTasks({}),
	});
	const meQuery = useQuery({ queryKey: ["sayr", "me"], queryFn: () => getMeFn({}) });

	// One release list per org — a release id from one org means nothing
	// compared against another's, so options are built per org below, not as
	// one flat combined fetch.
	const orgs = data?.orgs ?? [];
	const releaseQueries = useQueries({
		queries: orgs.map((org) => ({
			queryKey: ["sayr", "releases", org.slug],
			queryFn: () => listReleasesFn({ orgSlug: org.slug }),
		})),
	});
	const releaseOptions: ReleaseOption[] = useMemo(() => {
		const options: ReleaseOption[] = [];
		orgs.forEach((org, index) => {
			const releases = releaseQueries[index]?.data?.releases ?? [];
			for (const release of releases) {
				options.push({
					value: release.id,
					label: orgs.length > 1 ? `${org.shortId} · ${release.name}` : release.name,
					color: release.color ?? undefined,
				});
			}
		});
		options.push({ value: NO_RELEASE, label: "No release" });
		return options;
	}, [orgs, releaseQueries]);

	const visibleTasks = useMemo(() => {
		const q = query.trim().toLowerCase();
		return (data?.tasks ?? []).filter((task) => {
			if (hiddenOrgs.has(task.orgId)) return false;
			if (hiddenPriorities.has(task.priority)) return false;
			if (hiddenReleases.has(task.releaseId ?? NO_RELEASE)) return false;
			if (onlyMine && !(task.assignees ?? []).some((a) => a?.id === meQuery.data?.id)) return false;
			if (q && !(task.title ?? "").toLowerCase().includes(q)) return false;
			return true;
		});
	}, [data, hiddenOrgs, hiddenPriorities, hiddenReleases, onlyMine, meQuery.data?.id, query]);

	const columns = useMemo(() => {
		const grouped = new Map<string, Task[]>(BOARD_STATUSES.map((status) => [status, []]));
		for (const task of visibleTasks) {
			grouped.get(task.status)?.push(task);
		}
		return grouped;
	}, [visibleTasks]);

	function toggleOrg(orgId: string) {
		setHiddenOrgs((prev) => {
			const next = new Set(prev);
			if (next.has(orgId)) next.delete(orgId);
			else next.add(orgId);
			return next;
		});
	}

	function togglePriority(priority: Task["priority"]) {
		setHiddenPriorities((prev) => {
			const next = new Set(prev);
			if (next.has(priority)) next.delete(priority);
			else next.add(priority);
			return next;
		});
	}

	function toggleRelease(releaseId: string) {
		setHiddenReleases((prev) => {
			const next = new Set(prev);
			if (next.has(releaseId)) next.delete(releaseId);
			else next.add(releaseId);
			return next;
		});
	}

	const styles = useMemo(
		() => ({
			screen: { flex: 1, backgroundColor: theme.colors.surface0 },
			body: { flex: 1, position: "relative" as const },
			columns: { flexDirection: "row" as const, padding: layout.compact ? 8 : 12, gap: 12 },
			emptyText: { color: theme.colors.foregroundMuted, padding: 16, fontSize: 13 },
			retryText: { color: theme.colors.accent, fontSize: 13 },
		}),
		[theme, layout.compact]
	);

	if (isLoading) {
		return (
			<View style={styles.screen}>
				<Text style={styles.emptyText}>Loading tasks…</Text>
			</View>
		);
	}

	if (isError) {
		return (
			<View style={styles.screen}>
				<Text style={[styles.emptyText, { color: theme.colors.statusDanger }]}>
					{error instanceof Error ? error.message : "Failed to load tasks."}
				</Text>
				<Pressable accessibilityRole="button" onPress={() => refetch()} style={{ padding: 16 }}>
					<Text style={styles.retryText}>Retry</Text>
				</Pressable>
			</View>
		);
	}

	return (
		<View style={styles.screen}>
			<BoardHeader
				theme={theme}
				layout={layout}
				orgs={data?.orgs ?? []}
				hiddenOrgs={hiddenOrgs}
				onToggleOrg={toggleOrg}
				onSetHiddenOrgs={setHiddenOrgs}
				hiddenPriorities={hiddenPriorities}
				onTogglePriority={togglePriority}
				onSetHiddenPriorities={setHiddenPriorities}
				releaseOptions={releaseOptions}
				hiddenReleases={hiddenReleases}
				onToggleRelease={toggleRelease}
				onSetHiddenReleases={setHiddenReleases}
				onlyMine={onlyMine}
				onToggleOnlyMine={() => setOnlyMine((v) => !v)}
				query={query}
				onQueryChange={setQuery}
				dataUpdatedAt={dataUpdatedAt}
				isFetching={isFetching}
				onRefresh={() => refetch()}
			/>
			<View
				style={styles.body}
				onLayout={(event: LayoutChangeEvent) => setBodyWidth(event.nativeEvent.layout.width)}
			>
				<ScrollView horizontal contentContainerStyle={styles.columns}>
					{BOARD_STATUSES.map((status) => (
						<BoardColumn
							key={status}
							theme={theme}
							compact={layout.compact}
							title={STATUS_LABELS[status]}
							tasks={columns.get(status) ?? []}
							onOpenTask={(task) => setSelected({ taskId: task.id, orgSlug: task.orgSlug })}
						/>
					))}
				</ScrollView>
				<TaskDetailSheet
					theme={theme}
					layout={layout}
					navigation={navigation}
					selected={selected}
					bodyWidth={bodyWidth}
					panelWidth={panelWidth}
					onPanelWidthChange={setPanelWidth}
					onClose={() => setSelected(null)}
					onOpenTask={(taskId, orgSlug) => setSelected({ taskId, orgSlug })}
				/>
			</View>
		</View>
	);
}
