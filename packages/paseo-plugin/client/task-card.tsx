import { Icon } from "@getpaseo/plugin/client/react-native";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { formatTaskKey, PRIORITY_COLORS, PRIORITY_ICONS, PRIORITY_LABELS, type Task } from "../shared/task";
import { Avatar } from "./avatar";
import type { Theme } from "./types";

/** Stacked avatars past this count collapse into a "+N" badge — matches `unified-task-item-parts.tsx`'s `AssigneeAvatarTrigger` on the website. */
const MAX_VISIBLE_ASSIGNEES = 3;

/** One card on the board — key, title, priority badge (colored/bordered by priority, not org — see the org filter chips for that dimension instead), and assignee avatars. */
export function TaskCard({ theme, task, onPress }: { theme: Theme; task: Task; onPress: () => void }) {
	const assignees = (task.assignees ?? []).filter((a): a is NonNullable<typeof a> => Boolean(a));
	const visibleAssignees = assignees.slice(0, MAX_VISIBLE_ASSIGNEES);
	const overflowCount = assignees.length - visibleAssignees.length;

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
			meta: {
				flexDirection: "row" as const,
				alignItems: "center" as const,
				justifyContent: "space-between" as const,
				marginTop: 2,
			},
			priorityGroup: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4 },
			priority: { fontSize: 11, fontWeight: "600" as const },
			avatarStack: { flexDirection: "row" as const, alignItems: "center" as const },
			stackedAvatar: { borderWidth: 1.5, borderRadius: 999 },
			overflow: { marginLeft: 4, fontSize: 10, color: theme.colors.foregroundMuted },
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
				<View style={styles.priorityGroup}>
					<Icon name={PRIORITY_ICONS[task.priority]} size={12} color={PRIORITY_COLORS[task.priority]} />
					<Text style={[styles.priority, { color: PRIORITY_COLORS[task.priority] }]}>
						{PRIORITY_LABELS[task.priority]}
					</Text>
				</View>

				{visibleAssignees.length > 0 && (
					<View style={styles.avatarStack}>
						{visibleAssignees.map((assignee, index) => (
							<View
								key={assignee.id}
								style={[
									styles.stackedAvatar,
									{ borderColor: theme.colors.surface1, marginLeft: index === 0 ? 0 : -6 },
								]}
							>
								<Avatar theme={theme} name={assignee.name} imageUrl={assignee.image} size={18} />
							</View>
						))}
						{overflowCount > 0 && <Text style={styles.overflow}>+{overflowCount}</Text>}
					</View>
				)}
			</View>
		</Pressable>
	);
}
