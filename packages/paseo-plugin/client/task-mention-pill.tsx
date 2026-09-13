import { useRpc } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Pressable, Text } from "react-native";
import { getTaskRpc, STATUS_ICONS } from "../shared/task";
import type { Theme } from "./types";

/**
 * A `#task` mention pill (`client/prosekit-view.tsx`'s "task" mention kind) —
 * a small button-styled chip, not plain inline text, matching what the
 * website itself renders for the same mention
 * (`apps/start/src/components/prosekit/ui/task-mention.tsx`). The label is
 * always the mention's own stored key (e.g. "SAY-12" — never a live title,
 * to avoid depending on a title that can go stale/change after the mention
 * was written), but the status icon IS live: fetched via the exact same
 * `getTaskRpc` query key `task-detail-sheet.tsx` already uses for the open
 * task, so React Query dedupes/caches across every mention of the same task
 * on screen — this is not a fresh per-render round trip.
 */
export function TaskMentionPill({
	theme,
	orgSlug,
	taskId,
	label,
	onPress,
}: {
	theme: Theme;
	orgSlug: string;
	taskId: string;
	label: string;
	onPress?: () => void;
}) {
	const getTask = useRpc(getTaskRpc);
	const { data } = useQuery({
		queryKey: ["sayr", "task", orgSlug, taskId],
		queryFn: () => getTask({ taskId, orgSlug }),
		staleTime: 60_000,
		enabled: taskId.length > 0,
	});

	const styles = useMemo(
		() => ({
			pill: {
				flexDirection: "row" as const,
				alignItems: "center" as const,
				gap: 4,
				backgroundColor: theme.colors.surface2,
				borderRadius: 5,
				paddingHorizontal: 6,
				paddingVertical: 2,
			},
			label: { color: theme.colors.foreground, fontSize: 13, fontWeight: "600" as const },
		}),
		[theme]
	);

	return (
		<Pressable
			accessibilityRole={onPress ? "link" : undefined}
			accessibilityLabel={`Open task ${label}`}
			onPress={onPress}
			style={styles.pill}
		>
			{data && <Icon name={STATUS_ICONS[data.status]} size={12} color={theme.colors.foregroundMuted} />}
			<Text style={styles.label}>{label}</Text>
		</Pressable>
	);
}
