import { useRpc } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable } from "react-native";
import { getTaskRpc, listCategoriesRpc } from "../shared/task";
import { SendToAgentModal } from "./send-to-agent-modal";
import { Sheet } from "./sheet";
import { TaskDetailBody } from "./task-detail-body";
import type { Layout, Navigation, Theme } from "./types";

/**
 * Fetches the selected task and renders it in the sliding `Sheet` — the
 * sheet's own title comes from the fetch, so it shows the real task title
 * rather than a static placeholder. Also owns "Send to agent" as a header
 * action (not buried in scrollable content, see `sheet.tsx`'s
 * `headerActions`) — categories/org members it needs for the agent prompt
 * are fetched here with the SAME query keys `task-detail-body.tsx` already
 * uses for its own pickers, so this is cache-shared, not a duplicate fetch.
 */
export function TaskDetailSheet({
	theme,
	layout,
	navigation,
	selected,
	bodyWidth,
	panelWidth,
	onPanelWidthChange,
	onClose,
	onOpenTask,
}: {
	theme: Theme;
	layout: Layout;
	navigation: Navigation;
	selected: { taskId: string; orgSlug: string } | null;
	bodyWidth: number | null;
	panelWidth: number | null;
	onPanelWidthChange: (width: number) => void;
	onClose: () => void;
	onOpenTask: (taskId: string, orgSlug: string) => void;
}) {
	const getTask = useRpc(getTaskRpc);
	const listCategoriesFn = useRpc(listCategoriesRpc);
	const [sendOpen, setSendOpen] = useState(false);
	const taskQuery = useQuery({
		queryKey: ["sayr", "task", selected?.orgSlug, selected?.taskId],
		queryFn: () =>
			getTask({
				taskId: selected?.taskId ?? "",
				orgSlug: selected?.orgSlug ?? "",
			}),
		enabled: selected !== null,
	});
	const categoriesQuery = useQuery({
		queryKey: ["sayr", "categories", selected?.orgSlug],
		queryFn: () => listCategoriesFn({ orgSlug: selected?.orgSlug ?? "" }),
		enabled: selected !== null && sendOpen,
	});

	return (
		<Sheet
			open={selected !== null}
			onClose={onClose}
			title={taskQuery.data?.title ?? "Loading..."}
			headerActions={
				taskQuery.data ? (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Send this task to an agent"
						onPress={() => setSendOpen(true)}
					>
						<Icon name="Bot" size={18} color={theme.colors.foregroundMuted} />
					</Pressable>
				) : undefined
			}
			theme={theme}
			compact={layout.compact}
			bodyWidth={bodyWidth}
			width={panelWidth}
			onWidthChange={onPanelWidthChange}
		>
			{selected && (
				<TaskDetailBody
					theme={theme}
					taskId={selected.taskId}
					orgSlug={selected.orgSlug}
					query={taskQuery}
					onOpenTask={onOpenTask}
				/>
			)}
			{sendOpen && taskQuery.data && (
				<SendToAgentModal
					theme={theme}
					navigation={navigation}
					task={taskQuery.data}
					categories={categoriesQuery.data?.categories}
					onClose={() => setSendOpen(false)}
				/>
			)}
		</Sheet>
	);
}
