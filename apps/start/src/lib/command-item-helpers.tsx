/**
 * Shared helpers for composing CommandItem icon and metadata ReactNodes.
 *
 * These are the single source of truth for how task-related items look inside
 * the command palette. Import here rather than composing ad-hoc in hooks or
 * in AdminCommand.tsx.
 */
import { IconCheck, IconCircleFilled, IconMinus, IconPlus } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { statusConfig } from "@/components/tasks/shared/config";

/**
 * Returns the correctly coloured status icon for a task.
 * Includes the statusConfig colour class so `currentColor` in the SVG resolves
 * to the right hue (e.g. orange for in-progress, green for done).
 *
 * @param status  - raw task status string from the DB
 * @param faded   - when true, adds opacity-40 (e.g. already-assigned tasks)
 */
export function taskStatusIcon(status: string, faded = false): ReactNode {
	const conf = statusConfig[status as keyof typeof statusConfig];
	const fade = faded ? " opacity-40" : "";
	if (conf) {
		return conf.icon(`h-4 w-4 shrink-0 ${conf.className}${fade}`);
	}
	return <IconCircleFilled className={`h-4 w-4 shrink-0${fade}`} />;
}

/**
 * Monospaced short-ID badge rendered at the right of a task item.
 * Returns null when shortId is null/undefined so callers don't need to check.
 */
export function taskShortIdBadge(shortId: number | null | undefined): ReactNode {
	if (shortId == null) return null;
	return (
		<span className="text-xs text-muted-foreground font-mono">#{shortId}</span>
	);
}

/**
 * Metadata slot for a checked item (single-select or multi-select).
 * Shows a primary-coloured checkmark.
 */
export function checkMeta(): ReactNode {
	return <IconCheck className="h-3.5 w-3.5 text-primary" />;
}

/**
 * Metadata slot for an assignment toggle item.
 * Shows the task's short ID (if any) alongside an add or remove indicator.
 *
 * @param shortId    - task short ID
 * @param isAssigned - whether the task is already in the release
 */
export function assignToggleMeta(
	shortId: number | null | undefined,
	isAssigned: boolean,
): ReactNode {
	return (
		<span className="flex items-center gap-1.5">
			{taskShortIdBadge(shortId)}
			{isAssigned ? (
				<IconCheck className="h-3.5 w-3.5 text-primary" />
			) : (
				<IconPlus className="h-3.5 w-3.5 text-muted-foreground" />
			)}
		</span>
	);
}

/**
 * Metadata slot for a task that is confirmed in a release (static sub-view row).
 * Shows the short ID + a primary checkmark.
 */
export function inReleaseMeta(shortId: number | null | undefined): ReactNode {
	return (
		<span className="flex items-center gap-1.5">
			{taskShortIdBadge(shortId)}
			<IconCheck className="h-3.5 w-3.5 text-primary" />
		</span>
	);
}

/**
 * Placeholder item icon for an empty sub-view list.
 */
export const emptyItemIcon: ReactNode = (
	<IconMinus size={16} className="opacity-40" />
);
