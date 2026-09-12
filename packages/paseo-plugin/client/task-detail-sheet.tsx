import { useRpc } from "@getpaseo/plugin/client";
import { useQuery } from "@tanstack/react-query";
import { getTaskRpc } from "../shared/task";
import { Sheet } from "./sheet";
import { TaskDetailBody } from "./task-detail-body";
import type { Layout, Navigation, Theme } from "./types";

/** Fetches the selected task and renders it in the sliding `Sheet` — the sheet's own title comes from the fetch, so it shows the real task title rather than a static placeholder. */
export function TaskDetailSheet({
	theme,
	layout,
	navigation,
	selected,
	bodyWidth,
	panelWidth,
	onPanelWidthChange,
	onClose,
}: {
	theme: Theme;
	layout: Layout;
	navigation: Navigation;
	selected: { taskId: string; orgSlug: string } | null;
	bodyWidth: number | null;
	panelWidth: number | null;
	onPanelWidthChange: (width: number) => void;
	onClose: () => void;
}) {
	const getTask = useRpc(getTaskRpc);
	const taskQuery = useQuery({
		queryKey: ["sayr", "task", selected?.orgSlug, selected?.taskId],
		queryFn: () => getTask({ taskId: selected?.taskId ?? "", orgSlug: selected?.orgSlug ?? "" }),
		enabled: selected !== null,
	});

	return (
		<Sheet
			open={selected !== null}
			onClose={onClose}
			title={taskQuery.data?.title ?? "Task"}
			theme={theme}
			compact={layout.compact}
			bodyWidth={bodyWidth}
			width={panelWidth}
			onWidthChange={onPanelWidthChange}
		>
			{selected && (
				<TaskDetailBody
					theme={theme}
					navigation={navigation}
					taskId={selected.taskId}
					orgSlug={selected.orgSlug}
					query={taskQuery}
				/>
			)}
		</Sheet>
	);
}
