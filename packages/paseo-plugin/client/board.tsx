import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { TextInput } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { formatTaskKey, listTasksRpc, TASK_PRIORITIES, type Task } from "../shared/task";
import { TaskDetailSheet } from "./task-detail";

/**
 * Backlog/todo/in-progress only — done/canceled aren't fetched at all (see
 * `server/task-handlers.ts`, no more `--include-closed`), so there's nothing
 * to show a column for. The status picker in the task detail sheet still
 * covers the full `TASK_STATUSES` enum; a task moved to done/canceled there
 * just drops off this board until it's reopened.
 */
const BOARD_STATUSES = ["backlog", "todo", "in-progress"] as const;

const COLUMN_TITLES: Record<(typeof BOARD_STATUSES)[number], string> = {
	backlog: "Backlog",
	todo: "Todo",
	"in-progress": "In Progress",
};

type ThemeColorKey = keyof PluginSurfaceProps["theme"]["colors"];

/** Card border + priority badge color — theme tokens (not hardcoded hex) so it still reads correctly in whatever theme the user has picked. */
const PRIORITY_COLOR: Record<Task["priority"], ThemeColorKey> = {
	urgent: "statusDanger",
	high: "statusWarning",
	medium: "accent",
	low: "foregroundMuted",
	none: "foregroundMuted",
};

interface SelectedTask {
	taskId: string;
	orgSlug: string;
}

export function SayrBoard({ theme, layout, navigation }: PluginSurfaceProps) {
	const [selected, setSelected] = useState<SelectedTask | null>(null);
	const [hiddenOrgs, setHiddenOrgs] = useState<Set<string>>(new Set());
	const [hiddenPriorities, setHiddenPriorities] = useState<Set<Task["priority"]>>(new Set());
	const [query, setQuery] = useState("");
	const listTasks = useRpc(listTasksRpc);
	const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
		queryKey: ["sayr", "tasks"],
		queryFn: () => listTasks({}),
	});

	const visibleTasks = useMemo(() => {
		const q = query.trim().toLowerCase();
		return (data?.tasks ?? []).filter((task) => {
			if (hiddenOrgs.has(task.orgId)) return false;
			if (hiddenPriorities.has(task.priority)) return false;
			if (q && !(task.title ?? "").toLowerCase().includes(q)) return false;
			return true;
		});
	}, [data, hiddenOrgs, hiddenPriorities, query]);

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

	const styles = useMemo(
		() => ({
			screen: { flex: 1, backgroundColor: theme.colors.surface0 },
			header: {
				flexDirection: "row" as const,
				alignItems: "center" as const,
				justifyContent: "space-between" as const,
				padding: layout.compact ? 12 : 16,
				gap: 12,
				borderBottomWidth: 1,
				borderBottomColor: theme.colors.border,
			},
			title: { color: theme.colors.foreground, fontSize: layout.compact ? 16 : 18, fontWeight: "600" as const },
			refreshText: { color: theme.colors.accent, fontSize: 13 },
			searchInput: {
				flex: 1,
				maxWidth: 260,
				borderWidth: 1,
				borderColor: theme.colors.border,
				borderRadius: 6,
				paddingVertical: 6,
				paddingHorizontal: 10,
				color: theme.colors.foreground,
				backgroundColor: theme.colors.surface1,
				fontSize: 13,
			},
			filterRow: {
				flexDirection: "row" as const,
				flexWrap: "wrap" as const,
				gap: 8,
				paddingHorizontal: layout.compact ? 12 : 16,
				paddingTop: 10,
			},
			chip: {
				borderWidth: 1,
				borderColor: theme.colors.border,
				borderRadius: 999,
				paddingVertical: 4,
				paddingHorizontal: 10,
			},
			chipText: { color: theme.colors.foreground, fontSize: 12 },
			columns: { flexDirection: "row" as const, padding: layout.compact ? 8 : 12, gap: 12 },
			column: { width: layout.compact ? 240 : 280 },
			columnHeader: {
				flexDirection: "row" as const,
				justifyContent: "space-between" as const,
				paddingHorizontal: 8,
				paddingBottom: 8,
			},
			columnTitle: { color: theme.colors.foregroundMuted, fontSize: 12, fontWeight: "600" as const },
			columnCount: { color: theme.colors.foregroundMuted, fontSize: 12 },
			card: {
				backgroundColor: theme.colors.surface1,
				borderWidth: 1,
				borderColor: theme.colors.border,
				borderLeftWidth: 3,
				borderRadius: 8,
				padding: 10,
				marginBottom: 8,
				gap: 4,
			},
			cardKey: { color: theme.colors.foregroundMuted, fontSize: 11 },
			cardTitle: { color: theme.colors.foreground, fontSize: 13 },
			cardMeta: { flexDirection: "row" as const, gap: 6, marginTop: 2 },
			cardPriority: { fontSize: 11 },
			emptyText: { color: theme.colors.foregroundMuted, padding: 16, fontSize: 13 },
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
					<Text style={styles.refreshText}>Retry</Text>
				</Pressable>
			</View>
		);
	}

	return (
		<View style={styles.screen}>
			<View style={styles.header}>
				<Text style={styles.title}>Sayr tasks</Text>
				<TextInput
					value={query}
					onChangeText={setQuery}
					placeholder="Search…"
					style={styles.searchInput}
					autoCapitalize="none"
					autoCorrect={false}
				/>
				<Pressable accessibilityRole="button" accessibilityLabel="Refresh tasks" onPress={() => refetch()}>
					<Text style={styles.refreshText}>{isFetching ? "Refreshing…" : "Refresh"}</Text>
				</Pressable>
			</View>
			{data && data.orgs.length > 1 && (
				<View style={styles.filterRow}>
					{data.orgs.map((org) => (
						<Pressable
							key={org.id}
							accessibilityRole="button"
							accessibilityLabel={`Toggle ${org.name}`}
							style={[styles.chip, hiddenOrgs.has(org.id) ? { opacity: 0.4 } : null]}
							onPress={() => toggleOrg(org.id)}
						>
							<Text style={styles.chipText}>{org.name}</Text>
						</Pressable>
					))}
				</View>
			)}
			<View style={styles.filterRow}>
				{TASK_PRIORITIES.map((priority) => (
					<Pressable
						key={priority}
						accessibilityRole="button"
						accessibilityLabel={`Toggle ${priority} priority`}
						style={[styles.chip, hiddenPriorities.has(priority) ? { opacity: 0.4 } : null]}
						onPress={() => togglePriority(priority)}
					>
						<Text style={[styles.chipText, { color: theme.colors[PRIORITY_COLOR[priority]] }]}>{priority}</Text>
					</Pressable>
				))}
			</View>
			<ScrollView horizontal contentContainerStyle={styles.columns}>
				{BOARD_STATUSES.map((status) => {
					const tasks = columns.get(status) ?? [];
					return (
						<View key={status} style={styles.column}>
							<View style={styles.columnHeader}>
								<Text style={styles.columnTitle}>{COLUMN_TITLES[status].toUpperCase()}</Text>
								<Text style={styles.columnCount}>{tasks.length}</Text>
							</View>
							<ScrollView>
								{tasks.map((task) => (
									<Pressable
										key={task.id}
										accessibilityRole="button"
										accessibilityLabel={`Open task ${task.title ?? task.id}`}
										style={[styles.card, { borderLeftColor: theme.colors[PRIORITY_COLOR[task.priority]] }]}
										onPress={() => setSelected({ taskId: task.id, orgSlug: task.orgSlug })}
									>
										<Text style={styles.cardKey}>{formatTaskKey(task.orgShortId, task.shortId)}</Text>
										<Text style={styles.cardTitle}>{task.title ?? "(untitled)"}</Text>
										{task.priority !== "none" && (
											<View style={styles.cardMeta}>
												<Text
													style={[
														styles.cardPriority,
														{ color: theme.colors[PRIORITY_COLOR[task.priority]] },
													]}
												>
													{task.priority}
												</Text>
											</View>
										)}
									</Pressable>
								))}
								{tasks.length === 0 && <Text style={styles.emptyText}>No tasks</Text>}
							</ScrollView>
						</View>
					);
				})}
			</ScrollView>
			<TaskDetailSheet
				theme={theme}
				layout={layout}
				navigation={navigation}
				selected={selected}
				onClose={() => setSelected(null)}
			/>
		</View>
	);
}
