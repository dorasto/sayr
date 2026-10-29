import { Badge } from "@repo/ui/components/badge";
import { cn } from "@repo/ui/lib/utils";
import { formatDate } from "@repo/util";
import { IconRocket } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { BoardEntityRowProps } from "@/components/board/core/entity";
import RenderIcon from "@/components/generic/RenderIcon";
import { releaseStatusConfig } from "../config";
import type { ReleaseItem } from "./release-board-model";

/**
 * One release in the releases board's list view: icon, name, slug, then the target (or release) date and
 * the status badge — the kanban card's pieces (releases-kanban-card.tsx) laid out in the task row's h-7 shape.
 * The whole row links to the release page.
 */
export function ReleaseBoardRow({ item: release }: BoardEntityRowProps<ReleaseItem>) {
	const statusConfig = releaseStatusConfig[release.status];
	const released = release.status === "released";

	return (
		<Link
			to="/$orgId/releases/$releaseSlug"
			params={{ orgId: release.organizationId, releaseSlug: release.slug }}
			className="group flex h-7 items-center gap-2 px-2 text-xs hover:bg-accent transition-all rounded-xl"
		>
			<span className="shrink-0 flex items-center">
				{release.icon ? (
					<RenderIcon
						iconName={release.icon}
						color={release.color || "#ffffff"}
						button
						className="size-5! [&_svg]:size-3.5! border-0"
					/>
				) : (
					<span
						className="size-5 rounded-full flex items-center justify-center"
						style={{ backgroundColor: release.color || "#cccccc" }}
					>
						<IconRocket className="size-3 text-white" />
					</span>
				)}
			</span>
			<span
				className={cn(
					"truncate text-sm text-foreground min-w-0",
					release.status === "archived" && "text-muted-foreground"
				)}
			>
				{release.name}
			</span>
			<span className="truncate text-xs text-muted-foreground min-w-0 flex-1">{release.slug}</span>
			{!released && release.targetDate && (
				<span className="shrink-0 text-xs text-muted-foreground">Target: {formatDate(release.targetDate)}</span>
			)}
			<Badge
				className={cn("shrink-0 border rounded-lg text-xs gap-1 px-1.5 py-0.5 h-auto", statusConfig.badgeClassName)}
			>
				{statusConfig.icon("size-2.5")}
				{statusConfig.label}
				{released && release.releasedAt && ` ${formatDate(release.releasedAt)}`}
			</Badge>
		</Link>
	);
}
