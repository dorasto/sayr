import { IconAlertTriangle, IconBulb, IconChevronUp, IconRefresh, IconUserCircle } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import LoginDialog from "@/components/auth/login";
import { newPostLink } from "../board/new-post-path";
import { EmptyState } from "../ui/EmptyState";
import { PortalButton, portalButtonVariants } from "../ui/PortalButton";

/** Logged-out visitors: Activity is tied to an account, so ask them to log in. */
export function ActivityLoggedOutState() {
	return (
		<EmptyState
			className="py-20"
			icon={<IconUserCircle className="size-6" />}
			title="Log in to see your activity"
			description="Your votes and posts are kept under your account. Votes you cast while logged out are not tied to you, so they will not show up here."
			actions={<LoginDialog trigger={<PortalButton variant="primary">Log in</PortalButton>} />}
		/>
	);
}

/** The viewer has not voted on anything. */
export function ActivityVotedEmptyState({ orgSlug }: { orgSlug: string }) {
	return (
		<EmptyState
			className="py-14"
			icon={<IconChevronUp className="size-6" />}
			title="Nothing voted yet"
			description="Posts you vote on while logged in show up here, so you can follow what happens to them."
			actions={
				<Link to="/orgs/$orgSlug" params={{ orgSlug }} className={portalButtonVariants({ variant: "primary" })}>
					Browse open posts
				</Link>
			}
		/>
	);
}

/** The viewer has not posted anything (among the posts loaded so far). */
export function ActivityPostedEmptyState({ orgSlug, canPost }: { orgSlug: string; canPost: boolean }) {
	return (
		<EmptyState
			className="py-14"
			tone="accent"
			icon={<IconBulb className="size-6" />}
			title="You have not posted yet"
			description="Ideas and problems you share with the team show up here."
			actions={
				canPost && (
					<Link {...newPostLink(orgSlug)} className={portalButtonVariants({ variant: "primary" })}>
						Share an idea
					</Link>
				)
			}
		/>
	);
}

/** The votes or the post list could not be loaded. */
export function ActivityErrorState({ onRetry }: { onRetry: () => void }) {
	return (
		<div
			role="alert"
			className="flex items-center gap-3.5 rounded-portal-lg border border-[color-mix(in_oklch,var(--portal-bad)_45%,transparent)] bg-portal-surface px-[22px] py-5 shadow-portal-hl"
		>
			<span
				aria-hidden
				className="flex size-9 shrink-0 items-center justify-center rounded-portal-md bg-portal-bad-soft text-portal-bad"
			>
				<IconAlertTriangle className="size-5" />
			</span>
			<div className="min-w-0 flex-1">
				<div className="font-semibold text-[15px]">We could not load your activity</div>
				<div className="text-[13.5px] text-portal-fg-2">Check your connection and try again.</div>
			</div>
			<PortalButton onClick={onRetry}>
				<IconRefresh aria-hidden />
				Retry
			</PortalButton>
		</div>
	);
}
