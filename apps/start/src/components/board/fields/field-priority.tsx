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
import { cn } from "@repo/ui/lib/utils";
import { PRIORITY_CONFIG, type PriorityValue, ROW_LEADING_GUTTER_CLASS } from "../config/field-config";
import { useBoardCapabilities, useBoardItemActions } from "../core/board-data";
import { StaticField } from "./static-field";

interface FieldPriorityProps {
	task: schema.TaskWithLabels;
}

export function FieldPriority({ task }: FieldPriorityProps) {
	const { canEditFields } = useBoardCapabilities();
	const { execute } = useBoardItemActions(task);
	const current = PRIORITY_CONFIG[task.priority as PriorityValue];

	if (!canEditFields) {
		return (
			<StaticField
				className={cn(ROW_LEADING_GUTTER_CLASS, "h-3.5 grid place-items-center shrink-0")}
				title={current.label}
			>
				{current.icon("h-3.5 w-3.5")}
			</StaticField>
		);
	}

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
					className={cn(ROW_LEADING_GUTTER_CLASS, "h-3.5 grid place-items-center shrink-0 cursor-pointer")}
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
