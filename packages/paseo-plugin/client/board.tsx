import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { listTasksRpc, TASK_STATUSES, type Task } from "../shared/task";
import { TaskDetailModal } from "./task-detail";

const COLUMN_TITLES: Record<(typeof TASK_STATUSES)[number], string> = {
	backlog: "Backlog",
	todo: "Todo",
	"in-progress": "In Progress",
	done: "Done",
	canceled: "Canceled",
};

type ThemeColorKey = keyof PluginSurfaceProps["theme"]["colors"];

const PRIORITY_COLOR: Record<Task["priority"], ThemeColorKey> = {
	urgent: "statusDanger",
	high: "statusWarning",
	medium: "accent",
	low: "foregroundMuted",
	none: "foregroundMuted",
};

export function SayrBoard({ theme, layout, navigation }: PluginSurfaceProps) {
	const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
	const listTasks = useRpc(listTasksRpc);
	const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
		queryKey: ["sayr", "tasks"],
		queryFn: () => listTasks({}),
	});

	const columns = useMemo(() => {
		const grouped = new Map<string, Task[]>(TASK_STATUSES.map((status) => [status, []]));
		for (const task of data?.tasks ?? []) {
			grouped.get(task.status)?.push(task);
		}
		return grouped;
	}, [data]);

	const styles = useMemo(
		() => ({
			screen: { flex: 1, backgroundColor: theme.colors.surface0 },
			header: {
				flexDirection: "row" as const,
				alignItems: "center" as const,
				justifyContent: "space-between" as const,
				padding: layout.compact ? 12 : 16,
				borderBottomWidth: 1,
				borderBottomColor: theme.colors.border,
			},
			title: {
				color: theme.colors.foreground,
				fontSize: layout.compact ? 16 : 18,
				fontWeight: "600" as const,
			},
			refreshText: { color: theme.colors.accent, fontSize: 13 },
			columns: {
				flexDirection: "row" as const,
				padding: layout.compact ? 8 : 12,
				gap: 12,
			},
			column: { width: layout.compact ? 240 : 280 },
			columnHeader: {
				flexDirection: "row" as const,
				justifyContent: "space-between" as const,
				paddingHorizontal: 8,
				paddingBottom: 8,
			},
			columnTitle: {
				color: theme.colors.foregroundMuted,
				fontSize: 12,
				fontWeight: "600" as const,
			},
			columnCount: { color: theme.colors.foregroundMuted, fontSize: 12 },
			card: {
				backgroundColor: theme.colors.surface1,
				borderWidth: 1,
				borderColor: theme.colors.border,
				borderRadius: 8,
				padding: 10,
				marginBottom: 8,
				gap: 4,
			},
			cardKey: { color: theme.colors.foregroundMuted, fontSize: 11 },
			cardTitle: { color: theme.colors.foreground, fontSize: 13 },
			cardMeta: { flexDirection: "row" as const, gap: 6, marginTop: 2 },
			cardPriority: { fontSize: 11 },
			emptyText: {
				color: theme.colors.foregroundMuted,
				padding: 16,
				fontSize: 13,
			},
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
				<Pressable accessibilityRole="button" accessibilityLabel="Refresh tasks" onPress={() => refetch()}>
					<Text style={styles.refreshText}>{isFetching ? "Refreshing…" : "Refresh"}</Text>
				</Pressable>
			</View>
			<ScrollView horizontal contentContainerStyle={styles.columns}>
				{TASK_STATUSES.map((status) => {
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
										style={styles.card}
										onPress={() => setSelectedTaskId(task.id)}
									>
										<Text style={styles.cardKey}>#{task.shortId ?? "?"}</Text>
										<Text style={styles.cardTitle}>{task.title ?? "(untitled)"}</Text>
										{task.priority !== "none" && (
											<View style={styles.cardMeta}>
												<Text
													style={[
														styles.cardPriority,
														{
															color: theme.colors[PRIORITY_COLOR[task.priority]],
														},
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
			{selectedTaskId && (
				<TaskDetailModal
					theme={theme}
					layout={layout}
					navigation={navigation}
					taskId={selectedTaskId}
					onClose={() => setSelectedTaskId(null)}
				/>
			)}
		</View>
	);
}
