import type { schema } from "@repo/database";
import {
	ComboBox,
	ComboBoxContent,
	ComboBoxEmpty,
	ComboBoxGroup,
	ComboBoxItem,
	ComboBoxList,
	ComboBoxSearch,
	ComboBoxTrigger,
} from "@repo/ui/components/tomui/combo-box-unified";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { updateLabelToTaskAction } from "@/lib/fetches/task";
import { useLanderData } from "@/contexts/ContextLander";
import { useBoardTaskFieldAction } from "./use-board-task-field-action";

const MAX_VISIBLE_LABELS = 2;

interface FieldLabelProps {
	task: schema.TaskWithLabels;
}

/**
 * Compact label pills — hidden entirely when the task has no labels
 * (matches the existing org-scoped row's TaskLabelsInline, which also
 * renders null on empty). Shows up to MAX_VISIBLE_LABELS colored-dot pills
 * plus a "+N" overflow pill; the whole cluster is one ComboBox trigger, so
 * clicking any of it opens the multi-select label picker.
 */
export function FieldLabel({ task }: FieldLabelProps) {
	const { labels } = useLanderData();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	const { execute } = useBoardTaskFieldAction(task);
	const availableLabels = labels.filter((label) => label.organizationId === task.organizationId);
	const labelIds = task.labels.map((label) => label.id);

	if (task.labels.length === 0) return null;

	const visibleLabels = task.labels.slice(0, MAX_VISIBLE_LABELS);
	const overflowCount = task.labels.length - visibleLabels.length;

	return (
		<ComboBox
			values={labelIds}
			onValuesChange={(values) => {
				const nextLabels = availableLabels.filter((label) => values.includes(label.id));
				execute({
					kind: "multi",
					actionId: "update-task-labels",
					apiFn: () => updateLabelToTaskAction(task.organizationId, task.id, values, sseClientId),
					optimisticTask: { ...task, labels: nextLabels },
					toastMessages: {
						loading: { title: "Updating labels..." },
						success: { title: "Labels updated" },
						error: { title: "Failed to update labels" },
					},
				});
			}}
		>
			<ComboBoxTrigger asChild>
				<button
					type="button"
					data-no-propagate
					className="flex items-center gap-1 shrink-0 cursor-pointer"
					title={task.labels.map((label) => label.name).join(", ")}
				>
					{visibleLabels.map((label) => (
						<span
							key={label.id}
							className="flex items-center gap-1 h-5 max-w-20 rounded-full bg-accent px-1.5 text-[11px] font-medium text-muted-foreground"
						>
							<span
								className="size-1.5 rounded-full shrink-0"
								style={{ backgroundColor: label.color ?? "#9CA3AF" }}
							/>
							<span className="truncate">{label.name}</span>
						</span>
					))}
					{overflowCount > 0 && (
						<span className="flex items-center h-5 rounded-full bg-accent px-1.5 text-[11px] font-medium text-muted-foreground">
							+{overflowCount}
						</span>
					)}
				</button>
			</ComboBoxTrigger>
			<ComboBoxContent>
				<ComboBoxSearch placeholder="Search labels..." />
				<ComboBoxList>
					<ComboBoxEmpty>No labels found.</ComboBoxEmpty>
					<ComboBoxGroup>
						{availableLabels.map((label) => (
							<ComboBoxItem key={label.id} value={label.id} searchValue={label.name}>
								<span className="size-2 rounded-full" style={{ backgroundColor: label.color ?? "#9CA3AF" }} />
								<span>{label.name}</span>
							</ComboBoxItem>
						))}
					</ComboBoxGroup>
				</ComboBoxList>
			</ComboBoxContent>
		</ComboBox>
	);
}
