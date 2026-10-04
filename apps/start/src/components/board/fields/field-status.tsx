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
import { ROW_LEADING_GUTTER_CLASS, STATUS_CONFIG, type StatusValue } from "../config/field-config";
import { useBoardCapabilities, useBoardItemActions } from "../core/board-data";
import { StaticField } from "./static-field";

interface FieldStatusProps {
	task: schema.TaskWithLabels;
	/** Read-only boards only: show this text next to the icon (the public portal's wording) instead of the icon alone. */
	label?: string;
}

export function FieldStatus({ task, label }: FieldStatusProps) {
	const { canEditFields } = useBoardCapabilities();
	const { execute } = useBoardItemActions(task);
	const current = STATUS_CONFIG[task.status as StatusValue];

	if (!canEditFields) {
		if (label) {
			return (
				<StaticField
					className={cn(
						"inline-flex w-fit shrink-0 items-center gap-1.5 rounded-lg border px-1.5 py-0.5 text-xs font-medium",
						current.className
					)}
					title={current.label}
				>
					{current.icon("size-3.5")}
					{label}
				</StaticField>
			);
		}
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
				<ComboBoxSearch placeholder="Search status..." />
				<ComboBoxList>
					<ComboBoxEmpty>No statuses found.</ComboBoxEmpty>
					<ComboBoxGroup>
						{(Object.keys(STATUS_CONFIG) as StatusValue[]).map((status) => {
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
