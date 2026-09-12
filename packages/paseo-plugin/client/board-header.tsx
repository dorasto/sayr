import { TextInput } from "@getpaseo/plugin/client/react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { type Org, PRIORITY_COLORS, PRIORITY_LABELS, TASK_PRIORITIES, type Task } from "../shared/task";
import { FilterDropdown } from "./filter-dropdown";
import { SpinningIcon } from "./spinning-icon";
import type { Layout, Theme } from "./types";

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

/**
 * The board's single header row: title, org/priority filter dropdowns,
 * search, and "Updated Xm ago" + refresh — everything that used to be three
 * separate rows, consolidated to match `github-board`'s one-row chrome (see
 * its real `client/board.tsx` around line 3860).
 */
export function BoardHeader({
	theme,
	layout,
	orgs,
	hiddenOrgs,
	onToggleOrg,
	onSetHiddenOrgs,
	hiddenPriorities,
	onTogglePriority,
	onSetHiddenPriorities,
	query,
	onQueryChange,
	dataUpdatedAt,
	isFetching,
	onRefresh,
}: {
	theme: Theme;
	layout: Layout;
	orgs: Org[];
	hiddenOrgs: Set<string>;
	onToggleOrg: (orgId: string) => void;
	onSetHiddenOrgs: (next: Set<string>) => void;
	hiddenPriorities: Set<Task["priority"]>;
	onTogglePriority: (priority: Task["priority"]) => void;
	onSetHiddenPriorities: (next: Set<Task["priority"]>) => void;
	query: string;
	onQueryChange: (query: string) => void;
	dataUpdatedAt: number;
	isFetching: boolean;
	onRefresh: () => void;
}) {
	// Only one filter dropdown open at a time.
	const [openFilter, setOpenFilter] = useState<"org" | "priority" | null>(null);

	const styles = useMemo(
		() => ({
			header: {
				flexDirection: "row" as const,
				alignItems: "center" as const,
				gap: layout.compact ? 8 : 12,
				paddingHorizontal: layout.compact ? 12 : 16,
				paddingVertical: layout.compact ? 10 : 12,
				borderBottomWidth: 1,
				borderBottomColor: theme.colors.border,
				// `header` and the board's `body` are plain sibling Views, neither
				// positioned — without this, paint order falls back to DOM order
				// and `body` (declared after `header`) wins ties regardless of any
				// zIndex on header's own descendants (a dropdown's zIndex only
				// competes within header's own stacking context, never a sibling's).
				zIndex: 20,
				position: "relative" as const,
			},
			title: { color: theme.colors.foreground, fontSize: layout.compact ? 16 : 18, fontWeight: "600" as const },
			spacer: { flex: 1 },
			search: {
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
			updated: { color: theme.colors.foregroundMuted, fontSize: 12 },
			iconButton: { padding: 6, borderRadius: 6 },
		}),
		[theme, layout.compact]
	);

	return (
		<View style={styles.header}>
			<Text style={styles.title}>Sayr</Text>
			{orgs.length > 1 && (
				<FilterDropdown
					theme={theme}
					noun="orgs"
					open={openFilter === "org"}
					onToggleOpen={() => setOpenFilter((current) => (current === "org" ? null : "org"))}
					options={orgs.map((org) => ({ value: org.id, label: org.name }))}
					hidden={hiddenOrgs}
					onToggle={onToggleOrg}
					onShowAll={() => onSetHiddenOrgs(new Set())}
					onHideAll={() => onSetHiddenOrgs(new Set(orgs.map((org) => org.id)))}
				/>
			)}
			<FilterDropdown
				theme={theme}
				noun="priorities"
				open={openFilter === "priority"}
				onToggleOpen={() => setOpenFilter((current) => (current === "priority" ? null : "priority"))}
				options={TASK_PRIORITIES.map((priority) => ({
					value: priority,
					label: PRIORITY_LABELS[priority],
					color: PRIORITY_COLORS[priority],
				}))}
				hidden={hiddenPriorities}
				onToggle={onTogglePriority}
				onShowAll={() => onSetHiddenPriorities(new Set())}
				onHideAll={() => onSetHiddenPriorities(new Set(TASK_PRIORITIES))}
			/>
			<TextInput
				value={query}
				onChangeText={onQueryChange}
				placeholder="Search…"
				style={styles.search}
				autoCapitalize="none"
				autoCorrect={false}
			/>
			<View style={styles.spacer} />
			<Text style={styles.updated} numberOfLines={1}>
				Updated {relativeTime(dataUpdatedAt)}
			</Text>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={isFetching ? "Refreshing" : "Refresh tasks"}
				style={[styles.iconButton, isFetching && { opacity: 0.5 }]}
				onPress={onRefresh}
				disabled={isFetching}
			>
				<SpinningIcon name="RefreshCw" size={16} color={theme.colors.foreground} spinning={isFetching} />
			</Pressable>
		</View>
	);
}
