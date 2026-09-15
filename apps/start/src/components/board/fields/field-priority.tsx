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
import { PRIORITY_CONFIG, type PriorityValue } from "../config/field-config";
import { useBoardTaskFieldAction } from "./use-board-task-field-action";

interface FieldPriorityProps {
	task: schema.TaskWithLabels;
}

export function FieldPriority({ task }: FieldPriorityProps) {
	const { execute } = useBoardTaskFieldAction(task);
	const current = PRIORITY_CONFIG[task.priority as PriorityValue];

	return (
		<ComboBox
			value={task.priority}
			onValueChange={(value) => {
				if (!value) return;
				const priority = value as PriorityValue;
				execute({
					kind: "single",
					field: "priority",
					updateData: { priority },
					optimisticTask: { ...task, priority },
					toastMessages: {
						loading: { title: "Updating priority..." },
						success: { title: "Priority updated", description: `Changed to ${PRIORITY_CONFIG[priority].label}` },
						error: { title: "Failed to update priority" },
					},
				});
			}}
		>
			<ComboBoxTrigger asChild>
				<button
					type="button"
					data-no-propagate
					className="h-4 flex items-center rounded text-xs cursor-pointer"
					title={current.label}
				>
					{current.icon("h-3.5 w-3.5")}
				</button>
			</ComboBoxTrigger>
			<ComboBoxContent>
				<ComboBoxSearch placeholder="Search priority..." />
				<ComboBoxList>
					<ComboBoxEmpty>No priorities found.</ComboBoxEmpty>
					<ComboBoxGroup>
						{(Object.keys(PRIORITY_CONFIG) as PriorityValue[]).map((priority) => {
							const config = PRIORITY_CONFIG[priority];
							return (
								<ComboBoxItem key={priority} value={priority} searchValue={config.label}>
									{config.icon("h-4 w-4")}
									<span>{config.label}</span>
								</ComboBoxItem>
							);
						})}
					</ComboBoxGroup>
				</ComboBoxList>
			</ComboBoxContent>
		</ComboBox>
	);
}
