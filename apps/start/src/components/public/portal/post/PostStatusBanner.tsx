import { buttonVariants } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { formatDate } from "@repo/util";
import { IconArrowRight, IconBan, IconCheck, IconRocket } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { StatusChip } from "@/components/public/portal/ui/StatusChip";
import { getReleaseDate, isShipped } from "@/lib/portal/status";
import { BannerShell } from "./BannerShell";

interface BannerRelease {
	name: string;
	slug: string;
	status: string;
	releasedAt?: Date | string | null;
	targetDate?: Date | string | null;
	createdAt?: Date | string | null;
}

interface PostStatusBannerProps {
	task: { status: string; updatedAt?: Date | string | null };
	release?: BannerRelease | null;
	orgSlug: string;
	/** Name of the team member who wrote the latest update, when there is one (for the Won't do banner). */
	lastUpdateBy?: string | null;
	className?: string;
}

/**
 * The status banner under the stepper: shipped (green, with a link to the release notes), done but not released yet,
 * or won't do (red, with the date it was closed). Renders nothing for the other statuses.
 */
export function PostStatusBanner({ task, release, orgSlug, lastUpdateBy, className }: PostStatusBannerProps) {
	if (task.status === "canceled") {
		return (
			<div className={cn("flex flex-col gap-3", className)}>
				<BannerShell
					tone="bad"
					icon={<IconBan className="size-[18px]" />}
					title="The team will not build this"
					description={
						<>
							{task.updatedAt ? `Closed on ${formatDate(task.updatedAt, "en-GB")}.` : "This post is closed."}
							{lastUpdateBy ? ` The last update came from ${lastUpdateBy}.` : null}
						</>
					}
				/>
				<div className="flex items-center gap-2.5 px-1 text-[13px] text-muted-foreground">
					<StatusChip status="canceled" />
					Voting is closed on this post.
				</div>
			</div>
		);
	}

	if (release && isShipped(task, release)) {
		const releasedOn = getReleaseDate(release);
		return (
			<BannerShell
				className={className}
				tone="ok"
				icon={<IconCheck className="size-[18px]" stroke={2.5} />}
				title={`Shipped in ${release.name}`}
				description={releasedOn ? `Released ${formatDate(releasedOn, "en-GB")}` : undefined}
				action={
					<Link
						to="/orgs/$orgSlug/releases/$releaseSlug"
						params={{ orgSlug, releaseSlug: release.slug }}
						className={buttonVariants({ variant: "outline", size: "sm" })}
					>
						Read the notes
						<IconArrowRight aria-hidden />
					</Link>
				}
			/>
		);
	}

	if (task.status === "done" && release && (release.status === "planned" || release.status === "in-progress")) {
		const target = release.targetDate ? new Date(release.targetDate) : null;
		return (
			<BannerShell
				className={className}
				tone="neutral"
				icon={<IconRocket className="size-[18px]" />}
				title={`Done · ships in ${release.name}`}
				description={target ? `Target ${formatDate(target, "en-GB")}` : undefined}
				action={
					<Link
						to="/orgs/$orgSlug/releases/$releaseSlug"
						params={{ orgSlug, releaseSlug: release.slug }}
						className={buttonVariants({ variant: "outline", size: "sm" })}
					>
						View release
						<IconArrowRight aria-hidden />
					</Link>
				}
			/>
		);
	}

	return null;
}
