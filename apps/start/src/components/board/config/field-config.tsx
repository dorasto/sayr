import { schema } from "@repo/database";
import StatusIcon from "@repo/ui/components/icons/status";
import PriorityIcon from "@repo/ui/components/icons/priority";
import { IconAlertSquareFilled } from "@tabler/icons-react";
import type { ReactNode } from "react";

// Board's own status/priority presentation config — labels/colors/icons are
// new (not imported from components/tasks/shared/config.tsx), but the value
// lists themselves are derived from @repo/database's schema enums so they
// can never drift from what the DB actually allows.
//
// StatusIcon/PriorityIcon are generic @repo/ui glyph renderers (no
// task-domain logic embedded), not part of "the task system" being
// replaced — reused like any other @repo/ui primitive.

export type StatusValue = (typeof schema.statusEnum.enumValues)[number];
export type PriorityValue = (typeof schema.priorityEnum.enumValues)[number];

interface FieldPresentation {
	label: string;
	color: string;
	icon: (className: string) => ReactNode;
}

const STATUS_PRESENTATION: Record<StatusValue, Omit<FieldPresentation, "icon">> = {
	backlog: { label: "Backlog", color: "#6B7280" },
	todo: { label: "Todo", color: "#3B82F6" },
	"in-progress": { label: "In Progress", color: "#F59E0B" },
	done: { label: "Done", color: "#10B981" },
	canceled: { label: "Canceled", color: "#EF4444" },
};

const PRIORITY_PRESENTATION: Record<PriorityValue, Omit<FieldPresentation, "icon"> & { bars: 1 | 2 | 3 | "none" }> = {
	none: { label: "No Priority", color: "#9CA3AF", bars: "none" },
	low: { label: "Low", color: "#6B7280", bars: 1 },
	medium: { label: "Medium", color: "#F59E0B", bars: 2 },
	high: { label: "High", color: "#EF4444", bars: 3 },
	urgent: { label: "Urgent", color: "#DC2626", bars: 3 },
};

export const STATUS_CONFIG: Record<StatusValue, FieldPresentation> = Object.fromEntries(
	schema.statusEnum.enumValues.map((status) => [
		status,
		{
			...STATUS_PRESENTATION[status],
			icon: (className: string) => <StatusIcon status={status} className={className} />,
		},
	])
) as Record<StatusValue, FieldPresentation>;

export const PRIORITY_CONFIG: Record<PriorityValue, FieldPresentation> = Object.fromEntries(
	schema.priorityEnum.enumValues.map((priority) => {
		const presentation = PRIORITY_PRESENTATION[priority];
		return [
			priority,
			{
				label: presentation.label,
				color: presentation.color,
				icon:
					priority === "urgent"
						? (className: string) => <IconAlertSquareFilled className={className} />
						: (className: string) => <PriorityIcon bars={presentation.bars} className={className} />,
			},
		];
	})
) as Record<PriorityValue, FieldPresentation>;
