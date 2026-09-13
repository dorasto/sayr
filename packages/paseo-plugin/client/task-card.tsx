import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { formatTaskKey, PRIORITY_COLORS, PRIORITY_LABELS, type Task } from "../shared/task";
import type { Theme } from "./types";

/** One card on the board — key, title, and a priority badge, colored/bordered by priority (not org — see the org filter chips for that dimension instead). */
export function TaskCard({ theme, task, onPress }: { theme: Theme; task: Task; onPress: () => void }) {
	const styles = useMemo(
		() => ({
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
			key: { color: theme.colors.foregroundMuted, fontSize: 11 },
			title: { color: theme.colors.foreground, fontSize: 13 },
			meta: { flexDirection: "row" as const, gap: 6, marginTop: 2 },
			priority: { fontSize: 11, fontWeight: "600" as const },
		}),
		[theme]
	);

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={`Open task ${task.title ?? task.id}`}
			style={[styles.card, { borderLeftColor: PRIORITY_COLORS[task.priority] }]}
			onPress={onPress}
		>
			<Text style={styles.key}>{formatTaskKey(task.orgShortId, task.shortId)}</Text>
			<Text style={styles.title}>{task.title ?? "(untitled)"}</Text>

			<View style={styles.meta}>
				<Text style={[styles.priority, { color: PRIORITY_COLORS[task.priority] }]}>
					{PRIORITY_LABELS[task.priority]}
				</Text>
			</View>
		</Pressable>
	);
}
