import { buttonVariants } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { formatDate } from "@repo/util";
import { IconArrowRight, IconBan, IconCheck, IconRocket } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { StatusChip } from "@/components/public/portal/ui/StatusChip";
import { getReleaseDate, isShipped } from "@/lib/portal/status";

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

function BannerShell({
	tone,
	icon,
	title,
	description,
	action,
	className,
}: {
	tone: "ok" | "bad" | "neutral";
	icon: React.ReactNode;
	title: React.ReactNode;
	description?: React.ReactNode;
	action?: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex items-center gap-3.5 rounded-xl border px-[18px] py-4 max-md:flex-wrap",
				tone === "ok" && "border-success/40 bg-success/15",
				tone === "bad" && "border-destructive/35 bg-background",
				tone === "neutral" && "border-border bg-background",
				className
			)}
		>
			<span
				aria-hidden
				className={cn(
					"flex size-8 shrink-0 items-center justify-center rounded-lg",
					tone === "ok" && "bg-success text-background",
					tone === "bad" && "bg-destructive/15 text-destructive",
					tone === "neutral" && "bg-muted text-muted-foreground"
				)}
			>
				{icon}
			</span>
			<div className="min-w-0 flex-1">
				<div className="font-semibold text-[15px] text-foreground">{title}</div>
				{description && (
					<div className="mt-0.5 text-[13.5px] text-muted-foreground leading-[21px]">{description}</div>
				)}
			</div>
			{action && <div className="max-md:basis-full max-md:[&>*]:w-full">{action}</div>}
		</div>
	);
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
