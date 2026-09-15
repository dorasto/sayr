import { schema } from "@repo/database";
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
import { STATUS_CONFIG, type StatusValue } from "../config/field-config";
import { useBoardTaskFieldAction } from "./use-board-task-field-action";

interface FieldStatusProps {
	task: schema.TaskWithLabels;
}

export function FieldStatus({ task }: FieldStatusProps) {
	const { execute } = useBoardTaskFieldAction(task);
	const current = STATUS_CONFIG[task.status as StatusValue];

	return (
		<ComboBox
			value={task.status}
			onValueChange={(value) => {
				if (!value) return;
				const status = value as StatusValue;
				execute({
					kind: "single",
					field: "status",
					updateData: { status },
					optimisticTask: { ...task, status },
					toastMessages: {
						loading: { title: "Updating status..." },
						success: { title: "Status updated", description: `Changed to ${STATUS_CONFIG[status].label}` },
						error: { title: "Failed to update status" },
					},
				});
			}}
		>
			<ComboBoxTrigger className="w-auto gap-2">
				<ComboBoxValue>
					{current.icon("h-4 w-4")}
					<span>{current.label}</span>
				</ComboBoxValue>
				<ComboBoxIcon />
			</ComboBoxTrigger>
			<ComboBoxContent>
				<ComboBoxSearch placeholder="Search status..." />
				<ComboBoxList>
					<ComboBoxEmpty>No statuses found.</ComboBoxEmpty>
					<ComboBoxGroup>
						{schema.statusEnum.enumValues.map((status) => {
							const config = STATUS_CONFIG[status];
							return (
								<ComboBoxItem key={status} value={status} searchValue={config.label}>
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
