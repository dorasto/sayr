import { authClient } from "@repo/auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";
import { ensureCdnUrl, getInitials } from "@repo/util";
import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { UserSettingsDialog } from "@/components/settings/user-settings-dialog";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import { getOrgSlugFromPath, getPortalSection } from "@/lib/portal/nav";
import LoginDialog from "../auth/login";
import { PortalSearch } from "./portal/search/PortalSearch";
import { PortalAvatar } from "./portal/ui/PortalAvatar";
import { PortalButton } from "./portal/ui/PortalButton";

const NAV_LINK =
	"flex h-[34px] items-center gap-2 rounded-portal-md px-2.5 font-medium text-sm text-portal-fg-2 outline-none transition-colors hover:bg-portal-hover hover:text-portal-fg focus-visible:bg-portal-hover focus-visible:text-portal-fg focus-visible:ring-2 focus-visible:ring-portal-focus md:px-3.5";
const NAV_LINK_ACTIVE = "bg-portal-raised text-portal-fg";

/** 64px public top bar: org mark + name, Feedback / Roadmap / Changelog (+ Activity when logged in), search palette trigger, Log in or user avatar. */
export default function PublicNavigation() {
	const { data: session } = authClient.useSession();
	const { organization } = usePublicOrganizationLayout();
	const [settingsOpen, setSettingsOpen] = useState(false);

	const rawPathname = useRouterState({ select: (s) => s.location.pathname });
	const orgSlug = getOrgSlugFromPath(rawPathname);
	const feedbackPath = `/orgs/${orgSlug}`;
	const roadmapPath = `/orgs/${orgSlug}/roadmap`;
	const changelogPath = `/orgs/${orgSlug}/releases`;
	const activityPath = `/orgs/${orgSlug}/activity`;

	const section = getPortalSection(rawPathname, orgSlug);
	const isOnRoadmap = section === "roadmap";
	const isOnChangelog = section === "changelog";
	const isOnActivity = section === "activity";
	const isOnFeedback = section === "feedback";

	return (
		<>
			<header className="z-50 h-14 w-full md:h-16 shrink-0 border-portal-line border-b bg-portal-canvas">
				<div className="mx-auto flex h-full w-full max-w-[1120px] items-center gap-1 px-4 md:gap-2 md:px-6 xl:px-0">
					{/* Org identity */}
					<Link
						to={feedbackPath}
						className="mr-2 flex min-w-0 items-center gap-2.5 rounded-portal-sm outline-none focus-visible:ring-2 focus-visible:ring-portal-focus max-md:min-h-11 max-md:flex-1 md:mr-5 md:max-w-[220px] md:shrink-0"
					>
						<Avatar className="size-[30px] shrink-0 rounded-[9px]">
							{organization.logo ? (
								<AvatarImage src={ensureCdnUrl(organization.logo)} alt={organization.name} />
							) : null}
							<AvatarFallback className="rounded-[9px] bg-portal-accent font-semibold text-portal-on-accent text-xs">
								{getInitials(organization.name)}
							</AvatarFallback>
						</Avatar>
						<span className="min-w-0 truncate font-semibold text-[15px] text-portal-fg tracking-[-0.01em]">
							{organization.name}
						</span>
					</Link>

					<nav aria-label="Primary" className="hidden gap-0.5 md:flex">
						<Link
							to={feedbackPath}
							aria-current={isOnFeedback ? "page" : undefined}
							className={cn(NAV_LINK, isOnFeedback && NAV_LINK_ACTIVE)}
						>
							Feedback
						</Link>
						<Link
							to={roadmapPath}
							aria-current={isOnRoadmap ? "page" : undefined}
							className={cn(NAV_LINK, isOnRoadmap && NAV_LINK_ACTIVE)}
						>
							Roadmap
						</Link>
						<Link
							to={changelogPath}
							aria-current={isOnChangelog ? "page" : undefined}
							className={cn(NAV_LINK, isOnChangelog && NAV_LINK_ACTIVE)}
						>
							Changelog
						</Link>
						{session && (
							<Link
								to={activityPath}
								aria-current={isOnActivity ? "page" : undefined}
								className={cn(NAV_LINK, isOnActivity && NAV_LINK_ACTIVE)}
							>
								Activity
							</Link>
						)}
					</nav>

					<span className="hidden grow md:block" />

					<PortalSearch orgSlug={organization.slug} orgId={organization.id} orgShortId={organization.shortId} />

					{/* Auth */}
					<div className="shrink-0">
						{session ? (
							<button
								type="button"
								aria-label="Account settings"
								onClick={() => setSettingsOpen(true)}
								className="flex cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-portal-focus max-md:size-11"
							>
								<PortalAvatar name={session.user.name} image={session.user.image} size={32} />
							</button>
						) : (
							<LoginDialog trigger={<PortalButton>Log in</PortalButton>} />
						)}
					</div>
				</div>
			</header>

			{session && <UserSettingsDialog isOpen={settingsOpen} onOpenChange={setSettingsOpen} user={session.user} />}
		</>
	);
}
