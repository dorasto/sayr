import type { schema } from "@repo/database";
import {
	ComboBox,
	ComboBoxContent,
	ComboBoxEmpty,
	ComboBoxGroup,
	ComboBoxIcon,
	ComboBoxItem,
	ComboBoxList,
	ComboBoxSearch,
	ComboBoxTrigger,
	ComboBoxValue,
} from "@repo/ui/components/tomui/combo-box-unified";
import { useStateManagement } from "@repo/ui/hooks/useStateManagement.ts";
import { IconTag } from "@tabler/icons-react";
import { useLanderData } from "@/contexts/ContextLander";
import { updateLabelToTaskAction } from "@/lib/fetches/task";
import { useBoardTaskFieldAction } from "./use-board-task-field-action";

interface FieldLabelProps {
	task: schema.TaskWithLabels;
}

export function FieldLabel({ task }: FieldLabelProps) {
	const { labels } = useLanderData();
	const { value: sseClientId } = useStateManagement<string>("sse-clientId", "");
	const { execute } = useBoardTaskFieldAction(task);
	const availableLabels = labels.filter((label) => label.organizationId === task.organizationId);
	const labelIds = task.labels.map((label) => label.id);

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
			<ComboBoxTrigger className="w-auto gap-2">
				<ComboBoxValue>
					<IconTag className="h-4 w-4 text-muted-foreground" />
					<span>{task.labels.length > 0 ? `${task.labels.length} labels` : "Labels"}</span>
				</ComboBoxValue>
				<ComboBoxIcon />
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
