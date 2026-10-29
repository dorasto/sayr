import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";
import { extractTaskText, formatDate, getInitials } from "@repo/util";
import { IconRocket } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import RenderIcon from "@/components/generic/RenderIcon";
import { SegmentedProgress } from "@/components/public/portal/ui/SegmentedProgress";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { useReleaseTaskCounts } from "./board/release-task-counts";

interface ReleasesKanbanCardProps {
	release: schema.releaseType;
	orgId: string;
}

/** "Released …", "Due …" (overdue while still open), or nothing set yet. */
function getReleaseDateLabel(release: schema.releaseType): { text: string; overdue: boolean } {
	if (release.status === "released" && release.releasedAt) {
		return { text: `Released ${formatDate(release.releasedAt)}`, overdue: false };
	}
	if (!release.targetDate) return { text: "No target date", overdue: false };
	const overdue = release.status !== "archived" && new Date(release.targetDate).getTime() < Date.now();
	return { text: `Due ${formatDate(release.targetDate)}${overdue ? " · overdue" : ""}`, overdue };
}

/**
 * A release on the releases board, shaped like the task cards (no border or status stripe; the column already says
 * the status): icon, name and slug on one line, a line of the notes, the release's tasks as a segmented bar (done /
 * in progress / planned, canceled left out — the public changelog's bar), then the lead and the due/released date.
 */
export function ReleasesKanbanCard({ release, orgId }: ReleasesKanbanCardProps) {
	const { organization } = useLayoutOrganization();
	const descriptionPreview = extractTaskText(release.description);
	const counts = useReleaseTaskCounts(release.id);
	const lead = release.leadId
		? organization.members.find((member) => member.userId === release.leadId)?.user
		: undefined;
	const date = getReleaseDateLabel(release);

	const total = counts ? counts.done + counts.inProgress + counts.planned : 0;
	const progressLabel = !counts
		? null
		: total === 0
			? "No tasks"
			: counts.done === total
				? `${total} ${total === 1 ? "task" : "tasks"} shipped`
				: `${counts.done} of ${total} done`;

	return (
		<Link
			to="/$orgId/releases/$releaseSlug"
			params={{ orgId, releaseSlug: release.slug }}
			className="flex w-full min-w-0 flex-col gap-2 rounded-xl bg-card p-3 transition-colors hover:bg-accent"
		>
			<div className="flex min-w-0 items-center gap-2">
				{release.icon ? (
					<RenderIcon
						iconName={release.icon}
						color={release.color || "#ffffff"}
						button
						className="size-5! shrink-0 border-0 [&_svg]:size-3.5!"
					/>
				) : (
					<span
						className="flex size-5 shrink-0 items-center justify-center rounded-md"
						style={{ backgroundColor: release.color || "#cccccc" }}
					>
						<IconRocket className="size-3 text-white" />
					</span>
				)}
				<span className="min-w-0 flex-1 line-clamp-1 break-all text-sm font-medium">{release.name}</span>
				<span className="max-w-24 shrink-0 truncate font-mono text-[11px] text-muted-foreground">
					{release.slug}
				</span>
			</div>

			{descriptionPreview && (
				<p className="line-clamp-1 break-all text-xs text-muted-foreground">{descriptionPreview}</p>
			)}

			{/* Always laid out (an empty bar while the counts load) so cards don't jump when they arrive. */}
			<div className="flex h-4 items-center gap-2">
				{counts && total > 0 && progressLabel ? (
					<SegmentedProgress
						className="h-1.5 flex-1"
						label={progressLabel}
						segments={[
							{ value: counts?.done ?? 0, tone: "ok" },
							{ value: counts?.inProgress ?? 0, tone: "accent" },
							{ value: counts?.planned ?? 0, tone: "muted" },
						]}
					/>
				) : (
					<span className="h-1.5 flex-1 rounded-[4px] bg-border" aria-hidden />
				)}
				{progressLabel && (
					<span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{progressLabel}</span>
				)}
			</div>

			<div className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
				{lead ? (
					<>
						<Avatar className="size-4 shrink-0">
							<AvatarImage src={lead.image ?? undefined} alt={lead.name} />
							<AvatarFallback className="text-[8px]">{getInitials(lead.name)}</AvatarFallback>
						</Avatar>
						<span className="min-w-0 truncate">{lead.displayName || lead.name}</span>
					</>
				) : (
					<span>No lead</span>
				)}
				<span className={cn("ml-auto shrink-0", date.overdue && "text-destructive")}>{date.text}</span>
			</div>
		</Link>
	);
}
