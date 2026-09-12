import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import type { Task } from "../shared/task";
import { TaskCard } from "./task-card";
import type { Theme } from "./types";

/** One status column on the board — a header (name + count) and its cards. */
export function BoardColumn({
	theme,
	compact,
	title,
	tasks,
	onOpenTask,
}: {
	theme: Theme;
	compact: boolean;
	title: string;
	tasks: Task[];
	onOpenTask: (task: Task) => void;
}) {
	const styles = useMemo(
		() => ({
			column: { width: compact ? 240 : 280 },
			header: {
				flexDirection: "row" as const,
				justifyContent: "space-between" as const,
				paddingHorizontal: 8,
				paddingBottom: 8,
			},
			title: { color: theme.colors.foregroundMuted, fontSize: 12, fontWeight: "600" as const },
			count: { color: theme.colors.foregroundMuted, fontSize: 12 },
			empty: { color: theme.colors.foregroundMuted, padding: 16, fontSize: 13 },
		}),
		[theme, compact]
	);

	return (
		<View style={styles.column}>
			<View style={styles.header}>
				<Text style={styles.title}>{title.toUpperCase()}</Text>
				<Text style={styles.count}>{tasks.length}</Text>
			</View>
			<ScrollView>
				{tasks.map((task) => (
					<TaskCard key={task.id} theme={theme} task={task} onPress={() => onOpenTask(task)} />
				))}
				{tasks.length === 0 && <Text style={styles.empty}>No tasks</Text>}
			</ScrollView>
		</View>
	);
}
