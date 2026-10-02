import { IconArrowLeft, IconLock } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { EmptyState } from "@/components/public/portal/ui/EmptyState";
import { portalButtonVariants } from "@/components/public/portal/ui/PortalButton";

/** Shown when a post does not exist or is not public. The loader does not tell the two cases apart. */
export function PostNotAvailable({ orgSlug }: { orgSlug: string }) {
	return (
		<div className="flex h-full min-h-[60vh] items-center justify-center overflow-y-auto p-6">
			<h1 className="sr-only">Post not available</h1>
			<EmptyState
				icon={<IconLock className="size-6" />}
				title="This post is not public"
				description="It may have been removed, or it is only visible to the team."
				actions={
					<Link to="/orgs/$orgSlug" params={{ orgSlug }} className={portalButtonVariants()}>
						<IconArrowLeft aria-hidden />
						Back to feedback
					</Link>
				}
			/>
		</div>
	);
}
