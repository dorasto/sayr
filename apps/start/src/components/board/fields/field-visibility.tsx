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
import { VISIBILITY_CONFIG, type VisibilityValue } from "../config/field-config";
import { useBoardTaskFieldAction } from "./use-board-task-field-action";

interface FieldVisibilityProps {
	task: schema.TaskWithLabels;
}

export function FieldVisibility({ task }: FieldVisibilityProps) {
	const { execute } = useBoardTaskFieldAction(task);
	const current = VISIBILITY_CONFIG[task.visible];

	return (
		<ComboBox
			value={task.visible}
			onValueChange={(value) => {
				if (!value) return;
				const visible = value as VisibilityValue;
				execute({
					kind: "single",
					field: "visibility",
					updateData: { visible },
					optimisticTask: { ...task, visible },
					toastMessages: {
						loading: { title: "Updating visibility..." },
						success: { title: "Visibility updated", description: `Task is now ${visible}` },
						error: { title: "Failed to update visibility" },
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
				<ComboBoxSearch placeholder="Search visibility..." />
				<ComboBoxList>
					<ComboBoxEmpty>No visibility options found.</ComboBoxEmpty>
					<ComboBoxGroup>
						{(Object.keys(VISIBILITY_CONFIG) as VisibilityValue[]).map((visible) => {
							const config = VISIBILITY_CONFIG[visible];
							return (
								<ComboBoxItem key={visible} value={visible} searchValue={config.label}>
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
