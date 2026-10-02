import { authClient } from "@repo/auth/client";
import type { schema } from "@repo/database";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl, formatDate, getDisplayName, getInitials } from "@repo/util";
import { IconMessageCircle } from "@tabler/icons-react";
import { lazy, Suspense } from "react";
import { COMMENT_PROSE } from "@/components/public/portal/post/prose";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { getHealthPill } from "@/lib/portal/release-page";
import type { StatusUpdateData } from "./public-release-status-updates";

const Editor = lazy(() => import("@/components/prosekit/editor"));

interface StatusUpdateItemProps {
	update: StatusUpdateData;
	isLast: boolean;
	onOpenComments: () => void;
}

/** One entry of the "Updates from the team" timeline: ringed avatar + connector, name, health pill, date, content. */
export function StatusUpdateItem({ update, isLast, onOpenComments }: StatusUpdateItemProps) {
	const { data: session } = authClient.useSession();
	const { tasks } = usePublicOrganizationLayout();
	const authorName = update.author ? getDisplayName(update.author) : "Team";
	const canOpenComments = update.commentCount > 0 || !!session?.user;
	const healthPill = getHealthPill(update.health);

	return (
		<div className="flex gap-4">
			<div className="flex flex-col items-center">
				<Avatar className="size-8 shadow-[0_0_0_2px_var(--background),0_0_0_3.5px_var(--primary)]">
					<AvatarImage
						src={update.author?.image ? ensureCdnUrl(update.author.image) : undefined}
						alt={authorName}
					/>
					<AvatarFallback className="text-xs">{getInitials(authorName)}</AvatarFallback>
				</Avatar>
				{!isLast && <span className="mt-2 w-px flex-1 bg-border" />}
			</div>
			<div className={cn("min-w-0 flex-1", !isLast && "pb-7")}>
				<div className="flex min-h-6 flex-wrap items-center gap-2">
					<b className="font-semibold text-foreground">{authorName}</b>
					{healthPill && (
						<span
							className={cn(
								"inline-flex h-[22px] items-center whitespace-nowrap rounded-md px-2 font-semibold text-xs",
								healthPill.tone === "ok" && "bg-success/15 text-success",
								healthPill.tone === "accent" && "bg-primary/15 text-primary",
								healthPill.tone === "bad" && "bg-destructive/15 text-destructive"
							)}
						>
							{healthPill.label}
						</span>
					)}
					{update.createdAt && (
						<time dateTime={update.createdAt} className="text-[13px] text-muted-foreground">
							{formatDate(update.createdAt, "en-GB")}
						</time>
					)}
				</div>
				{update.content && (
					<div className={cn("mt-1.5", COMMENT_PROSE)}>
						<Suspense fallback={<div className="h-4 w-3/4 animate-pulse rounded bg-muted" />}>
							<Editor
								readonly
								defaultContent={update.content as schema.NodeJSON}
								tasks={tasks}
								hideBlockHandle
							/>
						</Suspense>
					</div>
				)}
				{canOpenComments && (
					<button
						type="button"
						onClick={onOpenComments}
						className="mt-2 inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-2.5 font-medium text-[12.5px] text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground"
					>
						<IconMessageCircle aria-hidden className="size-3.5" />
						{update.commentCount > 0
							? `${update.commentCount} ${update.commentCount === 1 ? "comment" : "comments"}`
							: "Comment"}
					</button>
				)}
			</div>
		</div>
	);
}
