import type { schema } from "@repo/database";
import { cn } from "@repo/ui/lib/utils";
import { IconLock } from "@tabler/icons-react";

interface LabelBadgeProps {
	label: Pick<schema.labelType, "name" | "color"> & { visible?: schema.labelType["visible"] };
	className?: string;
	showName?: boolean;
}

/**
 * Single shared "how a label looks" presentational piece — colored dot,
 * name, and a lock icon when the label is private. Used everywhere a label
 * renders as real JSX (field-label.tsx's row pill + picker list,
 * board-bulk-action-bar.tsx's inline picker row + command-palette icon,
 * quick-filter-panel.tsx's Label tab) so they can't drift out of sync with
 * each other. Not used for plain option lists that aren't label-specific
 * (category/release/org still render their own dot inline — this is only
 * for an actual label).
 */
export function LabelBadge({ label, className, showName = true }: LabelBadgeProps) {
	return (
		<span className={cn("inline-flex min-w-0 items-center gap-1", className)}>
			<span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: label.color ?? "#9CA3AF" }} />
			{showName && <span className="truncate">{label.name}</span>}
			{label.visible === "private" && <IconLock className="size-3 shrink-0 text-muted-foreground" />}
		</span>
	);
}
