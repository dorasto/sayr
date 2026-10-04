import { Link } from "@tanstack/react-router";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import type { PanelHeaderConfig } from "@/lib/sidebar/sidebar-store";
import { PeekHeaderActions } from "./PeekHeaderActions";
import { PeekKeyPill } from "./PeekKeyPill";
import { PeekPostView } from "./PeekPostView";
import { PeekSkeleton } from "./PeekSkeleton";
import { usePeek } from "./peek-context";

/**
 * Header for the post view in the `PanelHeaderConfig` object form, so `Page` renders its native h-11 bar around it.
 * A module-level constant on purpose: both parts read the open post from `usePeek()`, so it is handed to the store
 * once per view change and stays in sync by itself.
 */
export const PEEK_HEADER: PanelHeaderConfig = {
	icon: <PeekKeyPill />,
	actions: <PeekHeaderActions />,
	showClose: false,
};

/**
 * Body of the post view in the board panel. Takes no props: it reads the open post from `usePeek()`, which resolves it
 * from the board's live list (or a fetch for a deep link), so it re-renders on votes, status changes and comments
 * without the panel content ever being re-set. `Page` keys the panel content on the trigger id, so switching rows (or
 * going between a post and the overview) remounts it.
 */
export function PeekPanelContent() {
	const { post, status, shortId } = usePeek();
	const { organization } = usePublicOrganizationLayout();

	if (post) return <PeekPostView post={post} />;

	if (status === "error" && shortId !== null) {
		return (
			<div className="flex flex-col gap-2 text-[13.5px] text-muted-foreground">
				<p className="font-semibold text-[15px] text-foreground">This post could not be loaded</p>
				<Link
					to="/orgs/$orgSlug/$shortId"
					params={{ orgSlug: organization.slug, shortId: String(shortId) }}
					className="font-medium text-primary hover:underline"
				>
					Open the full page
				</Link>
			</div>
		);
	}

	return <PeekSkeleton />;
}

/** Stable element handed to the panel store once (it holds no props, see `PeekPanelContent`). */
export const PEEK_CONTENT = <PeekPanelContent />;
