import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";
import { formatDate, formatDateCompact, getInitials } from "@repo/util";
import { IconRocket } from "@tabler/icons-react";
import RenderIcon from "@/components/generic/RenderIcon";
import { SegmentedProgress } from "@/components/public/portal/ui/SegmentedProgress";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useReleaseTaskCounts } from "./board/release-board-stats";

// Small pieces shared by the releases board's card, list row and side panel.

/**
 * The one date worth showing on a release, compact ("Apr 20", year only when it isn't this year): when it shipped
 * once released, else its target. The surrounding context says which; the full date and its meaning are the tooltip.
 */
export function getReleaseDisplayDate(release: schema.releaseType): { short: string; title: string } | null {
	if (release.status === "released" && release.releasedAt) {
		return { short: formatDateCompact(release.releasedAt), title: `Released ${formatDate(release.releasedAt)}` };
	}
	if (!release.targetDate) return null;
	return { short: formatDateCompact(release.targetDate), title: `Target ${formatDate(release.targetDate)}` };
}

/** The release's lead as an org member's user, if it has one. */
export function useReleaseLead(release: schema.releaseType): schema.userType | undefined {
	const { organization } = useLayoutOrganization();
	if (!release.leadId) return undefined;
	return organization.members.find((member) => member.userId === release.leadId)?.user;
}

/** The release's own icon in its colour (a rocket on its colour when it has none). */
export function ReleaseIcon({ release, className }: { release: schema.releaseType; className?: string }) {
	return release.icon ? (
		<RenderIcon
			iconName={release.icon}
			color={release.color || "#ffffff"}
			button
			className={cn("size-5! shrink-0 border-0 [&_svg]:size-3.5!", className)}
		/>
	) : (
		<span
			className={cn("flex size-5 shrink-0 items-center justify-center rounded-md", className)}
			style={{ backgroundColor: release.color || "#cccccc" }}
		>
			<IconRocket className="size-3 text-white" />
		</span>
	);
}

/** A small avatar for a user (the release lead), with their name as the tooltip. */
export function ReleaseLeadAvatar({ user, className }: { user: schema.userType; className?: string }) {
	return (
		<Avatar className={cn("size-4 shrink-0", className)} title={user.displayName || user.name}>
			<AvatarImage src={user.image ?? undefined} alt={user.name} />
			<AvatarFallback className="text-[8px]">{getInitials(user.name)}</AvatarFallback>
		</Avatar>
	);
}

/**
 * The release's tasks as the public changelog's segmented bar (done / in progress / planned; canceled left out) with
 * a count. `compact` labels it "1/4" (side panel), else "1 of 4 done" / "4 tasks shipped" / "No tasks" (card). Always
 * laid out — an empty bar while the counts load — so nothing jumps when they arrive.
 */
export function ReleaseTaskProgress({ releaseId, compact = false }: { releaseId: string; compact?: boolean }) {
	const counts = useReleaseTaskCounts(releaseId);
	const total = counts ? counts.done + counts.inProgress + counts.planned : 0;
	const label = !counts
		? null
		: compact
			? total === 0
				? null
				: `${counts.done}/${total}`
			: total === 0
				? "No tasks"
				: counts.done === total
					? `${total} ${total === 1 ? "task" : "tasks"} shipped`
					: `${counts.done} of ${total} done`;
	const accessibleLabel = counts ? `${counts.done} of ${total} tasks done` : "Loading tasks";

	return (
		<div className="flex h-4 min-w-0 flex-1 items-center gap-2">
			{counts && total > 0 ? (
				<SegmentedProgress
					className={cn("flex-1", compact ? "h-1" : "h-1.5")}
					label={accessibleLabel}
					segments={[
						{ value: counts.done, tone: "ok" },
						{ value: counts.inProgress, tone: "accent" },
						{ value: counts.planned, tone: "muted" },
					]}
				/>
			) : (
				<span className={cn("flex-1 rounded-[4px] bg-border", compact ? "h-1" : "h-1.5")} aria-hidden />
			)}
			{label && <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{label}</span>}
		</div>
	);
}
