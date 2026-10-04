import { cn } from "@repo/ui/lib/utils";
import { IconMessage, IconRocket } from "@tabler/icons-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { getOrgSlugFromPath, getPortalSection, hidesMobileTabBar, type PortalSection } from "@/lib/portal/nav";

/**
 * Phone-only (< 768px) bottom tab bar: Feedback (with the roadmap as one of its layouts), and Changelog (the viewer's activity is in the account dialog, from the avatar). It is a flex
 * sibling below the scrolling page, so nothing hides behind it, and it pads for the home-indicator safe area. It steps
 * aside on pages that bring their own bottom action bar (a post, the new post form).
 */
export function MobileTabBar() {
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const orgSlug = getOrgSlugFromPath(pathname);
	if (!orgSlug || hidesMobileTabBar(pathname, orgSlug)) return null;

	const section: PortalSection = getPortalSection(pathname, orgSlug);
	const params = { orgSlug };
	const tabClass = (target: PortalSection) =>
		cn(
			"flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-lg font-medium text-muted-foreground text-xs outline-none transition-colors hover:text-foreground focus-visible:text-foreground",
			section === target && "text-foreground [&>svg]:text-primary"
		);
	const current = (target: PortalSection) => (section === target ? ("page" as const) : undefined);

	return (
		<nav
			aria-label="Primary"
			className="flex shrink-0 gap-1 border-t bg-sidebar px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
		>
			<Link to="/orgs/$orgSlug" params={params} aria-current={current("feedback")} className={tabClass("feedback")}>
				<IconMessage aria-hidden className="size-[22px]" stroke={1.9} />
				Feedback
			</Link>
			<Link
				to="/orgs/$orgSlug/releases"
				params={params}
				aria-current={current("changelog")}
				className={tabClass("changelog")}
			>
				<IconRocket aria-hidden className="size-[22px]" stroke={1.9} />
				Changelog
			</Link>
		</nav>
	);
}
