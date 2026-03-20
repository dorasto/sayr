import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import TasqIcon from "@repo/ui/components/brand-icon";
import { Button } from "@repo/ui/components/button";
import { SidebarTrigger } from "@repo/ui/components/doras-ui/sidebar";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@repo/ui/components/input-group";
import { IconSearch, IconUser } from "@tabler/icons-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@repo/auth/client";
import { usePublicOrganizationLayout } from "@/contexts/publicContextOrg";
import LoginDialog from "../auth/login";
import { PublicSearchDialog } from "./search-dialog";
import { UserSettingsDialog } from "@/components/settings/user-settings-dialog";

export default function PublicNavigation() {
	const { data: session } = authClient.useSession();
	const { organization } = usePublicOrganizationLayout();
	const [searchOpen, setSearchOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);

	const rawPathname = useRouterState({ select: (s) => s.location.pathname });
	const orgSlugMatch = rawPathname.match(/^\/orgs\/([^/]+)/);
	const orgSlug = orgSlugMatch?.[1] ?? "";
	const tasksPath = `/orgs/${orgSlug}`;

	return (
		<>
			<header className="bg-sidebar h-(--header-height) z-50 flex w-full shrink-0 items-center">
				<div className="flex w-full items-center gap-2 px-2">
					{/* Mobile sidebar toggle */}
					<SidebarTrigger sidebarId="public-sidebar" className="shrink-0" />

					{/* Org identity */}
					<Link to={tasksPath} className="flex items-center gap-2 shrink-0">
						<Avatar className="h-6 w-6 rounded-md">
							<AvatarImage src={organization.logo || ""} alt={organization.name} />
							<AvatarFallback className="rounded-md uppercase text-xs">
								<TasqIcon className="size-6! transition-all" />
							</AvatarFallback>
						</Avatar>
						<span className="font-bold text-sm hidden sm:block">{organization.name}</span>
					</Link>

					{/* Fake search input — opens PublicSearchDialog on click */}
					<div className="flex flex-1 justify-center px-2">
						<button
							type="button"
							className="w-full max-w-sm"
							onClick={() => setSearchOpen(true)}
						>
							<InputGroup className="bg-accent/50 rounded-xl border-transparent hover:bg-accent transition-all text-muted-foreground max-w-sm h-8 cursor-pointer pointer-events-none">
								<InputGroupAddon>
									<IconSearch className="size-3.5" />
								</InputGroupAddon>
								<InputGroupInput
									readOnly
									placeholder="Search tasks & releases..."
									className="cursor-pointer"
									tabIndex={-1}
								/>
								<InputGroupAddon className="text-xs text-muted-foreground pr-2 hidden sm:flex">
									/
								</InputGroupAddon>
							</InputGroup>
						</button>
					</div>

					{/* Auth */}
					<div className="shrink-0">
						{session ? (
							<button type="button" onClick={() => setSettingsOpen(true)}>
								<Avatar className="h-7 w-7 rounded-md cursor-pointer">
									<AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
									<AvatarFallback className="rounded-md uppercase text-xs">
										<IconUser className="size-4" />
									</AvatarFallback>
								</Avatar>
							</button>
						) : (
							<LoginDialog trigger={<Button size="sm">Log in</Button>} />
						)}
					</div>
				</div>
			</header>

			<PublicSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
			{session && (
				<UserSettingsDialog
					isOpen={settingsOpen}
					onOpenChange={setSettingsOpen}
					user={session.user}
				/>
			)}
		</>
	);
}
