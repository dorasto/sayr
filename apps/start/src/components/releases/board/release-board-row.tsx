import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";
import { getInitials } from "@repo/util";
import { IconRocket } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { BoardEntityRowProps } from "@/components/board/core/entity";
import RenderIcon from "@/components/generic/RenderIcon";
import { useLayoutOrganization } from "@/contexts/ContextOrg";
import { releaseStatusConfig } from "../config";
import { getReleaseDateLabel } from "../releases-kanban-card";
import type { ReleaseItem } from "./release-board-model";

/**
 * One release in the releases board's list view, laid out like a task row (BoardRow): the status glyph first, then
 * the release's icon, name and slug, with the due/released date (red when overdue) and the lead on the right — no
 * coloured badge. The whole row links to the release page.
 */
export function ReleaseBoardRow({ item: release }: BoardEntityRowProps<ReleaseItem>) {
	const { organization } = useLayoutOrganization();
	const statusConfig = releaseStatusConfig[release.status];
	const date = getReleaseDateLabel(release);
	const lead = release.leadId ? organization.members.find((member) => member.userId === release.leadId)?.user : undefined;

	return (
		<Link
			to="/$orgId/releases/$releaseSlug"
			params={{ orgId: release.organizationId, releaseSlug: release.slug }}
			className="group flex h-7 items-center gap-2 rounded-xl px-2 text-xs transition-all hover:bg-accent"
		>
			<span className={cn("flex size-4 shrink-0 items-center justify-center", statusConfig.className)}>
				{statusConfig.icon("size-3.5")}
			</span>
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
			<span
				className={cn(
					"min-w-0 truncate text-sm text-foreground",
					release.status === "archived" && "text-muted-foreground"
				)}
			>
				{release.name}
			</span>
			<span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">{release.slug}</span>
			<span className={cn("shrink-0 text-muted-foreground", date.overdue && "text-destructive")}>{date.text}</span>
			{lead ? (
				<Avatar className="size-4 shrink-0" title={lead.displayName || lead.name}>
					<AvatarImage src={lead.image ?? undefined} alt={lead.name} />
					<AvatarFallback className="text-[8px]">{getInitials(lead.name)}</AvatarFallback>
				</Avatar>
			) : (
				<span className="size-4 shrink-0" aria-hidden />
			)}
		</Link>
	);
}
