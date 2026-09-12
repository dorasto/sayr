import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { Icon, TextInput } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
	formatTaskKey,
	listTasksRpc,
	type Org,
	PRIORITY_COLORS,
	PRIORITY_LABELS,
	TASK_PRIORITIES,
	type Task,
} from "../shared/task";
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

interface SelectedTask {
	taskId: string;
	orgSlug: string;
}

/** Mirrors the installed `github-board` plugin's own `relativeTime()` exactly. */
function relativeTime(timestampMs: number): string {
	if (timestampMs === 0) return "";
	const minutes = Math.round((Date.now() - timestampMs) / 60_000);
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.round(hours / 24);
	if (days < 30) return `${days}d ago`;
	return `${Math.round(days / 30)}mo ago`;
}

export function SayrBoard({ theme, layout, navigation }: PluginSurfaceProps) {
	const [selected, setSelected] = useState<SelectedTask | null>(null);
	const [hiddenOrgs, setHiddenOrgs] = useState<Set<string>>(new Set());
	const [hiddenPriorities, setHiddenPriorities] = useState<Set<Task["priority"]>>(new Set());
	const [orgFilterOpen, setOrgFilterOpen] = useState(false);
	const [priorityFilterOpen, setPriorityFilterOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [bodyWidth, setBodyWidth] = useState<number | null>(null);
	const [panelWidth, setPanelWidth] = useState<number | null>(null);
	const listTasks = useRpc(listTasksRpc);
	const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useQuery({
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

	function onLayoutBody(event: LayoutChangeEvent) {
		setBodyWidth(event.nativeEvent.layout.width);
	}

	const styles = useMemo(
		() => ({
			screen: { flex: 1, backgroundColor: theme.colors.surface0 },
			header: {
				flexDirection: "row" as const,
				alignItems: "center" as const,
				gap: layout.compact ? 8 : 12,
				paddingHorizontal: layout.compact ? 12 : 16,
				paddingVertical: layout.compact ? 10 : 12,
				borderBottomWidth: 1,
				borderBottomColor: theme.colors.border,
				// `header` and `body` are plain sibling Views, neither positioned —
				// without this, paint order falls back to DOM order and `body`
				// (declared after `header`) wins ties regardless of any zIndex on
				// header's own descendants (a dropdown's zIndex only competes
				// within header's own stacking context, never against a sibling's).
				zIndex: 20,
				position: "relative" as const,
			},
			title: { color: theme.colors.foreground, fontSize: layout.compact ? 16 : 18, fontWeight: "600" as const },
			headerSpacer: { flex: 1 },
			searchInput: {
				width: layout.compact ? 120 : 200,
				borderWidth: 1,
				borderColor: theme.colors.border,
				borderRadius: 6,
				paddingVertical: 6,
				paddingHorizontal: 10,
				color: theme.colors.foreground,
				backgroundColor: theme.colors.surface1,
				fontSize: 13,
			},
			updatedText: { color: theme.colors.foregroundMuted, fontSize: 12 },
			iconButton: { padding: 6, borderRadius: 6 },
			ghostButton: {
				flexDirection: "row" as const,
				alignItems: "center" as const,
				gap: 4,
				borderWidth: 1,
				borderColor: theme.colors.border,
				borderRadius: 6,
				paddingHorizontal: 10,
				paddingVertical: 6,
			},
			ghostButtonText: { color: theme.colors.foreground, fontSize: 12 },
			filterAnchor: { position: "relative" as const },
			dropdown: {
				position: "absolute" as const,
				top: "100%" as const,
				left: 0,
				marginTop: 4,
				minWidth: 200,
				maxHeight: 320,
				zIndex: 10,
				backgroundColor: theme.colors.surface1,
				borderWidth: 1,
				borderColor: theme.colors.border,
				borderRadius: 8,
				overflow: "hidden" as const,
			},
			dropdownActions: {
				flexDirection: "row" as const,
				gap: 6,
				paddingHorizontal: 8,
				paddingVertical: 6,
				borderBottomWidth: 1,
				borderBottomColor: theme.colors.border,
			},
			chipButton: {
				borderWidth: 1,
				borderColor: theme.colors.border,
				borderRadius: 6,
				paddingHorizontal: 10,
				paddingVertical: 3,
			},
			chipButtonText: { color: theme.colors.foreground, fontSize: 12 },
			dropdownRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, padding: 8 },
			checkbox: {
				width: 14,
				height: 14,
				borderRadius: 3,
				borderWidth: 1,
				borderColor: theme.colors.border,
				alignItems: "center" as const,
				justifyContent: "center" as const,
			},
			checkboxChecked: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
			dropdownLabel: { color: theme.colors.foreground, fontSize: 13, flex: 1 },
			body: { flex: 1, position: "relative" as const },
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
			cardPriority: { fontSize: 11, fontWeight: "600" as const },
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
					<Text style={styles.updatedText}>Retry</Text>
				</Pressable>
			</View>
		);
	}

	const orgs = data?.orgs ?? [];
	const shownOrgCount = orgs.length - hiddenOrgs.size;
	const shownPriorityCount = TASK_PRIORITIES.length - hiddenPriorities.size;

	return (
		<View style={styles.screen}>
			<View style={styles.header}>
				<Text style={styles.title}>Sayr</Text>
				{orgs.length > 1 && (
					<View style={styles.filterAnchor}>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={`Filter organizations: ${shownOrgCount} of ${orgs.length} shown`}
							style={styles.ghostButton}
							onPress={() => {
								setPriorityFilterOpen(false);
								setOrgFilterOpen((open) => !open);
							}}
						>
							<Text style={styles.ghostButtonText}>
								{shownOrgCount === orgs.length ? "All orgs" : `${shownOrgCount}/${orgs.length} orgs`} ▾
							</Text>
						</Pressable>
						{orgFilterOpen && (
							<View style={styles.dropdown}>
								<View style={styles.dropdownActions}>
									<Pressable style={styles.chipButton} onPress={() => setHiddenOrgs(new Set())}>
										<Text style={styles.chipButtonText}>All</Text>
									</Pressable>
									<Pressable
										style={styles.chipButton}
										onPress={() => setHiddenOrgs(new Set(orgs.map((org: Org) => org.id)))}
									>
										<Text style={styles.chipButtonText}>None</Text>
									</Pressable>
								</View>
								<ScrollView>
									{orgs.map((org) => {
										const checked = !hiddenOrgs.has(org.id);
										return (
											<Pressable
												key={org.id}
												accessibilityRole="checkbox"
												accessibilityState={{ checked }}
												style={styles.dropdownRow}
												onPress={() => toggleOrg(org.id)}
											>
												<View style={[styles.checkbox, checked && styles.checkboxChecked]}>
													{checked && (
														<Icon name="Check" size={10} color={theme.colors.accentForeground} />
													)}
												</View>
												<Text style={styles.dropdownLabel} numberOfLines={1}>
													{org.name}
												</Text>
											</Pressable>
										);
									})}
								</ScrollView>
							</View>
						)}
					</View>
				)}
				<View style={styles.filterAnchor}>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={`Filter priorities: ${shownPriorityCount} of ${TASK_PRIORITIES.length} shown`}
						style={styles.ghostButton}
						onPress={() => {
							setOrgFilterOpen(false);
							setPriorityFilterOpen((open) => !open);
						}}
					>
						<Text style={styles.ghostButtonText}>
							{shownPriorityCount === TASK_PRIORITIES.length
								? "All priorities"
								: `${shownPriorityCount}/${TASK_PRIORITIES.length} priorities`}{" "}
							▾
						</Text>
					</Pressable>
					{priorityFilterOpen && (
						<View style={styles.dropdown}>
							<View style={styles.dropdownActions}>
								<Pressable style={styles.chipButton} onPress={() => setHiddenPriorities(new Set())}>
									<Text style={styles.chipButtonText}>All</Text>
								</Pressable>
								<Pressable
									style={styles.chipButton}
									onPress={() => setHiddenPriorities(new Set(TASK_PRIORITIES))}
								>
									<Text style={styles.chipButtonText}>None</Text>
								</Pressable>
							</View>
							<ScrollView>
								{TASK_PRIORITIES.map((priority) => {
									const checked = !hiddenPriorities.has(priority);
									return (
										<Pressable
											key={priority}
											accessibilityRole="checkbox"
											accessibilityState={{ checked }}
											style={styles.dropdownRow}
											onPress={() => togglePriority(priority)}
										>
											<View style={[styles.checkbox, checked && styles.checkboxChecked]}>
												{checked && <Icon name="Check" size={10} color={theme.colors.accentForeground} />}
											</View>
											<Text style={[styles.dropdownLabel, { color: PRIORITY_COLORS[priority] }]}>
												{PRIORITY_LABELS[priority]}
											</Text>
										</Pressable>
									);
								})}
							</ScrollView>
						</View>
					)}
				</View>
				<TextInput
					value={query}
					onChangeText={setQuery}
					placeholder="Search…"
					style={styles.searchInput}
					autoCapitalize="none"
					autoCorrect={false}
				/>
				<View style={styles.headerSpacer} />
				<Text style={styles.updatedText} numberOfLines={1}>
					Updated {relativeTime(dataUpdatedAt)}
				</Text>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={isFetching ? "Refreshing" : "Refresh tasks"}
					style={[styles.iconButton, isFetching && { opacity: 0.5 }]}
					onPress={() => refetch()}
					disabled={isFetching}
				>
					<Icon name="RefreshCw" size={16} color={theme.colors.foreground} />
				</Pressable>
			</View>
			<View style={styles.body} onLayout={onLayoutBody}>
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
											style={[styles.card, { borderLeftColor: PRIORITY_COLORS[task.priority] }]}
											onPress={() => setSelected({ taskId: task.id, orgSlug: task.orgSlug })}
										>
											<Text style={styles.cardKey}>{formatTaskKey(task.orgShortId, task.shortId)}</Text>
											<Text style={styles.cardTitle}>{task.title ?? "(untitled)"}</Text>
											{task.priority !== "none" && (
												<View style={styles.cardMeta}>
													<Text style={[styles.cardPriority, { color: PRIORITY_COLORS[task.priority] }]}>
														{PRIORITY_LABELS[task.priority]}
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
					bodyWidth={bodyWidth}
					panelWidth={panelWidth}
					onPanelWidthChange={setPanelWidth}
					onClose={() => setSelected(null)}
				/>
			</View>
		</View>
	);
}
