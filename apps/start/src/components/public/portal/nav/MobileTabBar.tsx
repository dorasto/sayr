import { cn } from "@repo/ui/lib/utils";
import { IconLayoutKanban, IconMessage, IconRocket, IconUser } from "@tabler/icons-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { getOrgSlugFromPath, getPortalSection, hidesMobileTabBar, type PortalSection } from "@/lib/portal/nav";

const TAB =
	"flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-portal-md font-medium text-portal-fg-3 text-xs outline-none transition-colors hover:text-portal-fg focus-visible:text-portal-fg focus-visible:ring-2 focus-visible:ring-portal-focus";
const TAB_ACTIVE = "text-portal-fg [&>svg]:text-portal-accent-ink";
const ICON = "size-[22px]";

/**
 * Phone-only (< 768px) bottom tab bar: Feedback, Roadmap, Changelog and You (the viewer's activity). It is a flex
 * sibling below the scrolling page, so nothing hides behind it, and it pads for the home-indicator safe area. It steps
 * aside on pages that bring their own bottom action bar (a post, the new post form).
 */
export function MobileTabBar() {
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const orgSlug = getOrgSlugFromPath(pathname);
	if (!orgSlug || hidesMobileTabBar(pathname, orgSlug)) return null;

	const section: PortalSection = getPortalSection(pathname, orgSlug);
	const params = { orgSlug };
	const current = (target: PortalSection) => (section === target ? ("page" as const) : undefined);

	return (
		<nav
			aria-label="Primary"
			className="flex shrink-0 gap-1 border-portal-line border-t bg-portal-canvas px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
		>
			<Link
				to="/orgs/$orgSlug"
				params={params}
				aria-current={current("feedback")}
				className={cn(TAB, section === "feedback" && TAB_ACTIVE)}
			>
				<IconMessage aria-hidden className={ICON} stroke={1.9} />
				Feedback
			</Link>
			<Link
				to="/orgs/$orgSlug/roadmap"
				params={params}
				aria-current={current("roadmap")}
				className={cn(TAB, section === "roadmap" && TAB_ACTIVE)}
			>
				<IconLayoutKanban aria-hidden className={ICON} stroke={1.9} />
				Roadmap
			</Link>
			<Link
				to="/orgs/$orgSlug/releases"
				params={params}
				aria-current={current("changelog")}
				className={cn(TAB, section === "changelog" && TAB_ACTIVE)}
			>
				<IconRocket aria-hidden className={ICON} stroke={1.9} />
				Changelog
			</Link>
			<Link
				to="/orgs/$orgSlug/activity"
				params={params}
				aria-current={current("activity")}
				className={cn(TAB, section === "activity" && TAB_ACTIVE)}
			>
				<IconUser aria-hidden className={ICON} stroke={1.9} />
				You
			</Link>
		</nav>
	);
}
