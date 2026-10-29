import { cn } from "@repo/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type { BoardEntityRowProps } from "@/components/board/core/entity";
import { releaseStatusConfig } from "../config";
import { getReleaseDisplayDate, ReleaseIcon, ReleaseLeadAvatar, useReleaseLead } from "../release-parts";
import type { ReleaseItem } from "./release-board-model";

/**
 * One release in the releases board's list view, laid out like a task row (BoardRow): the status glyph first, then
 * the release's icon, name and slug, with the compact target/released date and the lead on the right — no
 * coloured badge. The whole row links to the release page.
 */
export function ReleaseBoardRow({ item: release }: BoardEntityRowProps<ReleaseItem>) {
	const statusConfig = releaseStatusConfig[release.status];
	const date = getReleaseDisplayDate(release);
	const lead = useReleaseLead(release);

	return (
		<Link
			to="/$orgId/releases/$releaseSlug"
			params={{ orgId: release.organizationId, releaseSlug: release.slug }}
			className="group flex h-7 items-center gap-2 rounded-xl px-2 text-xs transition-all hover:bg-accent"
		>
			<span className={cn("flex size-4 shrink-0 items-center justify-center", statusConfig.className)}>
				{statusConfig.icon("size-3.5")}
			</span>
			<ReleaseIcon release={release} />
			<span
				className={cn(
					"min-w-0 truncate text-sm text-foreground",
					release.status === "archived" && "text-muted-foreground"
				)}
			>
				{release.name}
			</span>
			<span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">{release.slug}</span>
			{date && (
				<time className="shrink-0 tabular-nums text-muted-foreground" title={date.title}>
					{date.short}
				</time>
			)}
			{lead ? <ReleaseLeadAvatar user={lead} /> : <span className="size-4 shrink-0" aria-hidden />}
		</Link>
	);
}
