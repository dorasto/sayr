import type { schema } from "@repo/database";
import PriorityIcon from "@repo/ui/components/icons/priority";
import StatusIcon from "@repo/ui/components/icons/status";
import { IconAlertSquareFilled, IconEye, IconEyeOff } from "@tabler/icons-react";
import type { ReactNode } from "react";

// Board's own status/priority presentation config — labels/colors/icons are
// new (not imported from components/tasks/shared/config.tsx).
//
// Value TYPES are derived from @repo/database's schema enums via `import
// type` (erased at compile time, never bundled) so they can't drift from
// what the DB allows — TypeScript will flag a missing/stale key in the
// presentation records below if the enum changes. The VALUES themselves are
// hardcoded (not a live `schema.statusEnum.enumValues` read): this file is
// imported by client-rendered picker components, and `schema` is a runtime
// value pulling in the full Drizzle schema module (which uses
// `node:crypto` for id defaults) — Vite can't bundle that for the browser.
// This mirrors why the old system's tasks/shared/config.tsx does the same.
//
// StatusIcon/PriorityIcon are generic @repo/ui glyph renderers (no
// task-domain logic embedded), not part of "the task system" being
// replaced — reused like any other @repo/ui primitive.

export type StatusValue = (typeof schema.statusEnum.enumValues)[number];
export type PriorityValue = (typeof schema.priorityEnum.enumValues)[number];
export type VisibilityValue = (typeof schema.visibleEnum.enumValues)[number];

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

const VISIBILITY_PRESENTATION: Record<VisibilityValue, Omit<FieldPresentation, "icon">> = {
	public: { label: "Public", color: "#3B82F6" },
	private: { label: "Private", color: "#6B7280" },
};

export const STATUS_CONFIG: Record<StatusValue, FieldPresentation> = Object.fromEntries(
	(Object.keys(STATUS_PRESENTATION) as StatusValue[]).map((status) => [
		status,
		{
			...STATUS_PRESENTATION[status],
			icon: (className: string) => <StatusIcon status={status} className={className} />,
		},
	])
) as Record<StatusValue, FieldPresentation>;

export const PRIORITY_CONFIG: Record<PriorityValue, FieldPresentation> = Object.fromEntries(
	(Object.keys(PRIORITY_PRESENTATION) as PriorityValue[]).map((priority) => {
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

export const VISIBILITY_CONFIG: Record<VisibilityValue, FieldPresentation> = Object.fromEntries(
	(Object.keys(VISIBILITY_PRESENTATION) as VisibilityValue[]).map((visibility) => [
		visibility,
		{
			...VISIBILITY_PRESENTATION[visibility],
			icon: (className: string) =>
				visibility === "public" ? <IconEye className={className} /> : <IconEyeOff className={className} />,
		},
	])
) as Record<VisibilityValue, FieldPresentation>;
