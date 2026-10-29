import type { schema } from "@repo/database";
import { extractTaskText } from "@repo/util";
import { Link } from "@tanstack/react-router";
import {
	getReleaseDisplayDate,
	ReleaseIcon,
	ReleaseLeadAvatar,
	ReleaseTaskProgress,
	useReleaseLead,
} from "./release-parts";

interface ReleasesKanbanCardProps {
	release: schema.releaseType;
	orgId: string;
}

/**
 * A release on the releases board, shaped like the task cards (no border or status stripe; the column already says
 * the status): icon, name and slug on one line, a line of the notes, the release's tasks as a segmented bar, then the
 * lead and the target/released date (compact; each only when set).
 */
export function ReleasesKanbanCard({ release, orgId }: ReleasesKanbanCardProps) {
	const descriptionPreview = extractTaskText(release.description);
	const lead = useReleaseLead(release);
	const date = getReleaseDisplayDate(release);

	return (
		<Link
			to="/$orgId/releases/$releaseSlug"
			params={{ orgId, releaseSlug: release.slug }}
			className="flex w-full min-w-0 flex-col gap-2 rounded-xl bg-card p-3 transition-colors hover:bg-accent"
		>
			<div className="flex min-w-0 items-center gap-2">
				<ReleaseIcon release={release} />
				<span className="min-w-0 flex-1 line-clamp-1 break-all text-sm font-medium">{release.name}</span>
				<span className="max-w-24 shrink-0 truncate font-mono text-[11px] text-muted-foreground">
					{release.slug}
				</span>
			</div>

			{descriptionPreview && (
				<p className="line-clamp-1 break-all text-xs text-muted-foreground">{descriptionPreview}</p>
			)}

			<ReleaseTaskProgress releaseId={release.id} />

			{(lead || date) && (
				<div className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
					{lead && (
						<>
							<ReleaseLeadAvatar user={lead} />
							<span className="min-w-0 truncate">{lead.displayName || lead.name}</span>
						</>
					)}
					{date && (
						<time className="ml-auto shrink-0 tabular-nums" title={date.title}>
							{date.short}
						</time>
					)}
				</div>
			)}
		</Link>
	);
}
